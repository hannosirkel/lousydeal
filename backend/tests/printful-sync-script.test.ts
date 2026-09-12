/**
 * The explicit operator lifecycle around Printful catalogue reconciliation.
 *
 * The network boundary and reconciler are injected because either real one can
 * mutate a live Printful store. These tests exercise the real configuration,
 * refusal and reporting path while keeping that external mutation impossible.
 */

import { describe, expect, it } from "vitest";

import type { PrintfulClient } from "../src/modules/printful/client";
import { runPrintfulSync } from "../src/scripts/sync-printful";

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
});
