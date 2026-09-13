import { createRequire } from "node:module";
import { createServer, type Server } from "node:http";
import { dirname, join } from "node:path";

import express, { type RequestHandler } from "express";
import { afterEach, describe, expect, it } from "vitest";

import { readStoreOpen } from "../src/config/runtime";
import middlewareConfig, { isCommerceMutation, storeOpenGate } from "../src/api/middlewares";

const require = createRequire(join(process.cwd(), "backend/tests/store-availability.test.ts"));
const frameworkHttpDirectory = join(dirname(require.resolve("@medusajs/framework")), "http");
const { RoutesSorter } = require(join(frameworkHttpDirectory, "routes-sorter.js")) as {
  RoutesSorter: new (routes: RegisteredRoute[]) => { sort(): RegisteredRoute[] };
};

type RegisteredRoute = {
  readonly matcher: string | RegExp;
  readonly methods: readonly string[];
  readonly handler: RequestHandler;
};

const running: Server[] = [];
const originalStoreOpen = process.env.STORE_OPEN;

afterEach(async () => {
  if (originalStoreOpen === undefined) delete process.env.STORE_OPEN;
  else process.env.STORE_OPEN = originalStoreOpen;

  await Promise.all(
    running.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

function gateRoute(): RegisteredRoute {
  const route = middlewareConfig.routes?.find((candidate) => candidate.matcher === "/store/*");
  const handler = route?.middlewares?.[0];

  if (handler === undefined || route?.methods === undefined) {
    throw new Error("store availability middleware was not registered");
  }

  return { matcher: route.matcher, methods: route.methods, handler: handler as unknown as RequestHandler };
}

function createCommerceApp(events: string[]) {
  const app = express();
  const marker = (name: string): RequestHandler => (_request, response, next) => {
    events.push(name);
    if (name.startsWith("workflow:") || name === "withdrawal-handler") response.status(200).json({ reached: name });
    else next();
  };
  const routes: RegisteredRoute[] = [
    gateRoute(),
    {
      matcher: "/store/carts",
      methods: ["POST", "PUT", "PATCH", "DELETE"],
      handler: marker("validator"),
    },
    {
      matcher: "/store/carts",
      methods: ["POST", "PUT", "PATCH", "DELETE"],
      handler: marker("commerce-handler"),
    },
    {
      matcher: "/store/carts",
      methods: ["POST", "PUT", "PATCH", "DELETE"],
      handler: (request, response) => marker(`workflow:${request.method}`)(request, response, () => undefined),
    },
    {
      matcher: "/store/withdrawals",
      methods: ["POST"],
      handler: marker("withdrawal-handler"),
    },
  ];

  for (const route of new RoutesSorter(routes).sort()) {
    for (const method of route.methods) {
      switch (method) {
        case "POST":
          app.post(route.matcher, route.handler);
          break;
        case "PUT":
          app.put(route.matcher, route.handler);
          break;
        case "PATCH":
          app.patch(route.matcher, route.handler);
          break;
        case "DELETE":
          app.delete(route.matcher, route.handler);
          break;
        default:
          throw new Error(`unsupported test method: ${method}`);
      }
    }
  }

  return app;
}

async function requestCommerce(app: ReturnType<typeof express>, method: string, pathname: string): Promise<Response> {
  const server = createServer(app);
  running.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("commerce test server did not bind a TCP port");

  return fetch(`http://127.0.0.1:${address.port}${pathname}`, { method });
}

describe("backend STORE_OPEN", () => {
  it.each([
    [{}, false],
    [{ STORE_OPEN: "false" }, false],
    [{ STORE_OPEN: "TRUE" }, false],
    [{ STORE_OPEN: "1" }, false],
    [{ STORE_OPEN: "true " }, false],
    [{ STORE_OPEN: " true" }, false],
    [{ STORE_OPEN: "\ntrue\n" }, false],
    [{ STORE_OPEN: "true" }, true],
  ] as const)("reads %o as %s", (environment, expected) => {
    expect(readStoreOpen(environment)).toBe(expected);
  });

  it("returns the stable closed response without calling the next mutation handler", () => {
    const sent: { status?: number; body?: unknown } = {};
    const response = {
      status(status: number) {
        sent.status = status;
        return response;
      },
      json(body: unknown) {
        sent.body = body;
      },
    };
    const next = () => {
      throw new Error("next mutation handler was called");
    };

    storeOpenGate(response, next, false);

    expect(sent).toEqual({ status: 503, body: { code: "store_closed" } });
  });

  it("normalizes the store namespace and withdrawal exception to Express matching", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isCommerceMutation(method, "/STORE/carts/cart_1")).toBe(true);
    }
    expect(isCommerceMutation("POST", "/store/withdrawals")).toBe(false);
    expect(isCommerceMutation("POST", "/STORE/WITHDRAWALS/")).toBe(false);
    expect(isCommerceMutation("POST", "/webhooks/printful")).toBe(false);
    expect(isCommerceMutation("GET", "/store/carts/cart_1")).toBe(false);
  });

  it("runs the real sorted middleware chain before concrete commerce validators, handlers, and workflows", async () => {
    process.env.STORE_OPEN = "false";
    const closedEvents: string[] = [];
    const closedApp = createCommerceApp(closedEvents);

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await requestCommerce(closedApp, method, "/store/carts");
      expect(response.status, method).toBe(503);
      await expect(response.json()).resolves.toEqual({ code: "store_closed" });
    }
    expect(closedEvents).toEqual([]);

    process.env.STORE_OPEN = "true";
    const openEvents: string[] = [];
    const openApp = createCommerceApp(openEvents);
    const openResponse = await requestCommerce(openApp, "POST", "/STORE/carts");

    expect(openResponse.status).toBe(200);
    expect(openEvents).toEqual(["validator", "commerce-handler", "workflow:POST"]);
  });

  it("keeps accepted withdrawal spellings reachable through the registered chain while closed", async () => {
    process.env.STORE_OPEN = "false";
    const events: string[] = [];
    const app = createCommerceApp(events);

    for (const pathname of ["/store/withdrawals", "/STORE/WITHDRAWALS/"]) {
      const response = await requestCommerce(app, "POST", pathname);
      expect(response.status, pathname).toBe(200);
    }
    expect(events).toEqual(["withdrawal-handler", "withdrawal-handler"]);
  });

  it("registers the wildcard guard for every commerce write while leaving Printful POST-only", () => {
    const storeGate = middlewareConfig.routes?.find((route) => route.matcher === "/store/*");
    const printfulWebhook = middlewareConfig.routes?.find((route) => route.matcher === "/webhooks/printful");

    expect(storeGate?.methods).toEqual(["POST", "PUT", "PATCH", "DELETE"]);
    expect(printfulWebhook?.methods).toEqual(["POST"]);
  });
});
