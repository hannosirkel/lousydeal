/**
 * The explicit operator lifecycle around Printful catalogue reconciliation.
 *
 * The network boundary and reconciler are injected because either real one can
 * mutate a live Printful store. These tests exercise the real configuration,
 * refusal and reporting path while keeping that external mutation impossible.
 */

import { describe, expect, it } from "vitest";
import type { ExecArgs } from "@medusajs/framework/types";

import { createPrintfulClient, type PrintfulClient } from "../src/modules/printful/client";
import { syncMerchProducts } from "../src/modules/printful/sync";
import syncPrintful, { runPrintfulSync } from "../src/scripts/sync-printful";

const ART = "https://raw.githubusercontent.com/hannosirkel/lousydeal/0123456789abcdef0123456789abcdef01234567/design/merch/print-files";

const ENVIRONMENT = {
  JWT_SECRET: "jwt-secret-value",
  COOKIE_SECRET: "cookie-secret-value",
  DATABASE_HOST: "db.internal",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "lousydeal",
  DATABASE_USER: "medusa",
  DATABASE_PASSWORD: "db-secret-value",
  REDIS_HOST: "redis.internal",
  REDIS_PORT: "6379",
  REDIS_PASSWORD: "redis-secret-value",
  STRIPE_SECRET_KEY: "stripe-secret-key-value",
  STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret-value",
  PRINTFUL_API_TOKEN: "printful-secret-value",
  PRINTFUL_ARTWORK_BASE_URL: `  ${ART}/  `,
};

const unusedClient: PrintfulClient = {
  request: () => Promise.reject(new Error("network must not be called by this test")),
};

async function rejection(operation: () => Promise<unknown>): Promise<Error> {
  let caught: unknown;
  try {
    await operation();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  return caught as Error;
}

function loggerVisibleError(error: Error): string {
  const own = Object.fromEntries(
    Object.getOwnPropertyNames(error).map((name) => [name, (error as unknown as Record<string, unknown>)[name]]),
  );
  return [String(error), error.stack ?? "", JSON.stringify(error), JSON.stringify(own)].join("\n");
}

describe("the explicit Printful sync lifecycle", () => {
  it("refuses missing Printful configuration before constructing a client or reconciling", async () => {
    let clients = 0;
    let reconciliations = 0;

    await expect(runPrintfulSync(
      { ...ENVIRONMENT, PRINTFUL_API_TOKEN: undefined },
      {
        createClient: () => {
          clients += 1;
          return unusedClient;
        },
        reconcile: () => {
          reconciliations += 1;
          return Promise.reject(new Error("unreachable"));
        },
        write: () => undefined,
      },
    )).rejects.toThrow(/PRINTFUL_API_TOKEN.*PRINTFUL_ARTWORK_BASE_URL/);

    expect(clients).toBe(0);
    expect(reconciliations).toBe(0);
  });

  it("reconciles once with selected runtime configuration and reports only safe handles and counts", async () => {
    const output: string[] = [];
    let receivedToken = "";
    let reconciliations = 0;

    const result = await runPrintfulSync(ENVIRONMENT, {
      createClient: ({ token }) => {
        receivedToken = token;
        return unusedClient;
      },
      reconcile: (client, options) => {
        reconciliations += 1;
        expect(client).toBe(unusedClient);
        expect(options).toEqual({ artworkBaseUrl: ART });
        return Promise.resolve({
          created: ["original-purchase-receipt"],
          updated: ["this-mug-cost-extra"],
          unchanged: ["certified-worthless", "lousy-deals-trucker-cap"],
          unrecognised: ["918273 remote object name"],
        });
      },
      write: (line) => output.push(line),
    });

    expect(receivedToken).toBe("printful-secret-value");
    expect(reconciliations).toBe(1);
    expect(result).toEqual({ mutations: 2, created: 1, updated: 1, unchanged: 2, unrecognised: 1 });
    expect(output).toEqual([
      "Printful catalogue: mutations=2 created=1 updated=1 unchanged=2 unrecognised=1",
      "created: original-purchase-receipt",
      "updated: this-mug-cost-extra",
      "unchanged: certified-worthless, lousy-deals-trucker-cap",
    ]);
    expect(output.join("\n")).not.toContain("printful-secret-value");
    expect(output.join("\n")).not.toContain("918273");
    expect(output.join("\n")).not.toContain("remote object name");
  });

  it("bounds real client and reconciler failures before Medusa can serialize them", async () => {
    const token = "planted-printful-token-marker";
    const remoteId = "918273";
    const responseMarker = "planted-response-body-marker";
    let requests = 0;
    const localFetch: typeof globalThis.fetch = () => {
      requests += 1;
      if (requests === 1) {
        return Promise.resolve(new Response(JSON.stringify({
          result: [{
            id: Number(remoteId),
            external_id: "original-purchase-receipt",
            name: "Original Purchase Receipt",
          }],
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ result: `${responseMarker} ${token}` }), { status: 400 }));
    };
    const originalEnvironment = { ...process.env };
    const originalFetch = globalThis.fetch;
    let error: Error;
    try {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, ENVIRONMENT, { PRINTFUL_API_TOKEN: token });
      globalThis.fetch = localFetch;
      error = await rejection(() => syncPrintful({} as ExecArgs));
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, originalEnvironment);
    }

    expect(requests).toBe(2);
    expect(error.message).toBe("Printful catalogue reconciliation failed");
    expect("cause" in error).toBe(false);
    for (const marker of [token, remoteId, responseMarker, "/store/products/"]) {
      expect(loggerVisibleError(error)).not.toContain(marker);
    }
  });

  it("bounds malformed artwork configuration before any Printful request and never echoes it", async () => {
    const malformedArtwork = "https://artwork.invalid/planted-private-config-marker";
    let requests = 0;
    const localFetch: typeof globalThis.fetch = () => {
      requests += 1;
      return Promise.reject(new Error("unreachable"));
    };

    const error = await rejection(() => runPrintfulSync(
      { ...ENVIRONMENT, PRINTFUL_ARTWORK_BASE_URL: malformedArtwork },
      {
        createClient: (options) => createPrintfulClient({ ...options, fetch: localFetch, attempts: 1 }),
        reconcile: syncMerchProducts,
        write: () => undefined,
      },
    ));

    expect(requests).toBe(0);
    expect(error.message).toBe("Printful catalogue reconciliation failed");
    expect("cause" in error).toBe(false);
    for (const marker of [malformedArtwork, "planted-private-config-marker", ENVIRONMENT.PRINTFUL_API_TOKEN]) {
      expect(loggerVisibleError(error)).not.toContain(marker);
    }
  });
});
