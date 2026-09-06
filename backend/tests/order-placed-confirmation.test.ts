/**
 * The subscriber sends it.
 *
 * **This file exists because C9b could otherwise be dead code.** Every
 * assertion there drives `buildOrderConfirmation` directly, and a subscriber
 * that built the message and dropped it would pass all of them. C8 learned the
 * same lesson about the notification module never being registered.
 *
 * The subscriber is an ordinary async function over an event and a container,
 * so it is called with fakes. What it reads from `process.env` is set here,
 * because `sendConfirmation` assembles the runtime configuration itself —
 * there is no request to be handed one by.
 */

import { describe, expect, it, vi } from "vitest";

import { MERCHANT_ENVIRONMENT_VARIABLES, type MerchantIdentity } from "../src/config/merchant";

const MERCHANT: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
  phoneNumber: "+372 00 00000",
};

const SITE = "https://lousydeal.example";

/**
 * The subscriber actually sends it.
 *
 * **Without this the whole row could be dead code.** Every assertion above
 * drives `buildOrderConfirmation` directly; a subscriber that built the message
 * and dropped it would pass all of them. C8 learned the same lesson about the
 * notification module never being registered.
 *
 * The subscriber is an ordinary async function over an event and a container,
 * so it is called with fakes. What it reads from `process.env` is set here,
 * because `sendConfirmation` assembles the runtime configuration itself --
 * there is no request to be handed one by.
 */
describe("the subscriber", () => {
  /**
   * The subscriber, freshly imported.
   *
   * Asserted to a callable rather than inferred, for the reason
   * `medusa-config.test.ts` gives about its own dynamic import: this workspace
   * emits CommonJS, so under `moduleResolution: node16` tsc models
   * `import("./x.js")` the way Node models a `require` and gives `.default`
   * the module namespace rather than the function.
   */
  const subscriber = async () => {
    const imported = (await import("../src/subscribers/order-placed.js")) as unknown as {
      default: (args: unknown) => Promise<void>;
    };
    return imported.default;
  };

  const ENVIRONMENT: Record<string, string> = {
    JWT_SECRET: "j",
    COOKIE_SECRET: "c",
    DATABASE_HOST: "db",
    DATABASE_PORT: "5432",
    DATABASE_NAME: "n",
    DATABASE_USER: "u",
    DATABASE_PASSWORD: "p",
    REDIS_HOST: "r",
    REDIS_PORT: "6379",
    REDIS_PASSWORD: "rp",
    STRIPE_SECRET_KEY: "sk",
    STRIPE_WEBHOOK_SECRET: "wh",
    SITE_BASE_URL: SITE,
    SMTP_HOST: "mail.example.test",
    SMTP_PORT: "587",
    SMTP_USERNAME: "mail-user",
    SMTP_PASSWORD: "mail-password",
    SMTP_FROM_NAME: "Lousy Deal",
    SMTP_ENVELOPE_FROM: "orders@example.test",
    ...Object.fromEntries(
      Object.entries(MERCHANT_ENVIRONMENT_VARIABLES).map(([field, name]) => [
        name,
        MERCHANT[field as keyof MerchantIdentity],
      ]),
    ),
  };

  /** Runs the subscriber for one order and reports what it did. */
  async function run(environment: Record<string, string>, orderEmail: string | null = "buyer@example.test") {
    const original = { ...process.env };
    const notifications: Record<string, unknown>[] = [];
    const errors: string[] = [];
    const infos: string[] = [];

    try {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, environment);
      vi.resetModules();

      const order = {
        id: "order_01",
        email: orderEmail,
        currency_code: "usd",
        total: 25,
        created_at: "2026-09-06T10:00:00.000Z",
        metadata: {},
        items: [{ title: "Lousy Deal Pro", detail: { quantity: 1 } }],
      };

      const container = {
        resolve: (key: string) => {
          if (key === "logger") {
            return { info: (m: string) => infos.push(m), error: (m: string) => errors.push(m) };
          }
          if (key === "query") {
            return { graph: async () => ({ data: [order] }) };
          }
          if (key === "deal") {
            return {
              issueDeal: async () => ({
                id: "deal_1",
                order_id: "order_01",
                serial: 4102,
                public_slug: "xbts2k3mmv3trv3n",
              }),
            };
          }
          return {
            createNotifications: async (notification: Record<string, unknown>) => {
              notifications.push(notification);
            },
          };
        },
      };

      const orderPlaced = await subscriber();
      await orderPlaced({ event: { data: { id: "order_01" } }, container } as never);
    } finally {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, original);
      vi.resetModules();
    }

    return { notifications, errors, infos };
  }

  it("creates one email notification carrying the built confirmation", async () => {
    const { notifications, errors } = await run(ENVIRONMENT);

    expect(errors).toEqual([]);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ to: "buyer@example.test", channel: "email" });

    const content = notifications[0]?.content as { subject: string; text: string };
    expect(content.subject).toContain("#4,102");
    expect(content.text).toMatch(/§ 55 of the Estonian Law of Obligations Act/);
    expect(content.text).toContain(`${SITE}/done-deals/xbts2k3mmv3trv3n`);
  });

  it("sends nothing, and says which part is missing, when the deployment is not configured for it", async () => {
    // Each of the three arrives with C10 and C11. Until then the log line is
    // the whole of what an operator has, so it names the part rather than
    // saying the send failed.
    for (const [omit, expected] of [
      [Object.values(MERCHANT_ENVIRONMENT_VARIABLES), /the trader identity/],
      [["SITE_BASE_URL"], /SITE_BASE_URL/],
      [["SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM_NAME", "SMTP_ENVELOPE_FROM"], /a mail transport/],
    ] as const) {
      const partial = { ...ENVIRONMENT };
      for (const name of omit) delete partial[name];

      const { notifications, errors } = await run(partial);
      expect(notifications, String(omit[0])).toHaveLength(0);
      expect(errors.join("\n"), String(omit[0])).toMatch(expected);
      expect(errors.join("\n"), String(omit[0])).toMatch(/order_01/);
    }
  });

  it("sends nothing when the order carries no address, which every order did before C3b", async () => {
    const { notifications, errors } = await run(ENVIRONMENT, null);

    expect(notifications).toHaveLength(0);
    expect(errors.join("\n")).toMatch(/an address on the order/);
  });

  it("does not put the buyer's address in a log line", async () => {
    // The one piece of personal data this subscriber handles. A log line is a
    // place it would outlive the order record's own retention.
    const { infos, errors } = await run(ENVIRONMENT);

    expect([...infos, ...errors].join("\n")).not.toContain("buyer@example.test");
    expect(infos.join("\n")).toMatch(/§ 55 confirmation sent for order order_01/);
  });

  it("does not throw when the notification module fails, because Medusa retries a subscriber that rejects", async () => {
    const original = { ...process.env };
    const errors: string[] = [];
    try {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, ENVIRONMENT);
      vi.resetModules();

      const container = {
        resolve: (key: string) => {
          if (key === "logger") return { info: () => undefined, error: (m: string) => errors.push(m) };
          if (key === "query") {
            return {
              graph: async () => ({
                data: [
                  {
                    id: "order_01",
                    email: "buyer@example.test",
                    currency_code: "usd",
                    total: 25,
                    created_at: "2026-09-06T10:00:00.000Z",
                    metadata: {},
                    items: [{ title: "Lousy Deal Pro", detail: { quantity: 1 } }],
                  },
                ],
              }),
            };
          }
          if (key === "deal") {
            return { issueDeal: async () => ({ id: "d", order_id: "order_01", serial: 1, public_slug: "s" }) };
          }
          return {
            createNotifications: async () => {
              throw new Error("Unable to send email notification");
            },
          };
        },
      };

      const orderPlaced = await subscriber();
      await expect(
        orderPlaced({ event: { data: { id: "order_01" } }, container } as never),
      ).resolves.toBeUndefined();
      expect(errors.join("\n")).toMatch(/§ 55 confirmation failed for order order_01/);
    } finally {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, original);
      vi.resetModules();
    }
  });
});
