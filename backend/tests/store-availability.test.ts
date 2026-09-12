import { describe, expect, it } from "vitest";

import { readStoreOpen } from "../src/config/runtime";
import middlewareConfig, { isCommerceMutation, storeOpenGate } from "../src/api/middlewares";

describe("backend STORE_OPEN", () => {
  it.each([
    [{}, false],
    [{ STORE_OPEN: "false" }, false],
    [{ STORE_OPEN: "TRUE" }, false],
    [{ STORE_OPEN: "1" }, false],
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

  it("guards purchase writes but keeps withdrawal and webhooks usable", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isCommerceMutation(method, "/store/carts/cart_1")).toBe(true);
    }
    expect(isCommerceMutation("POST", "/store/withdrawals")).toBe(false);
    expect(isCommerceMutation("POST", "/webhooks/printful")).toBe(false);
    expect(isCommerceMutation("GET", "/store/carts/cart_1")).toBe(false);
  });

  it("registers the guard for every commerce write while leaving Printful POST-only", () => {
    const storeGate = middlewareConfig.routes?.find((route) => route.matcher === "/store/:path*");
    const printfulWebhook = middlewareConfig.routes?.find((route) => route.matcher === "/webhooks/printful");

    expect(storeGate?.methods).toEqual(["POST", "PUT", "PATCH", "DELETE"]);
    expect(printfulWebhook?.methods).toEqual(["POST"]);
  });
});
