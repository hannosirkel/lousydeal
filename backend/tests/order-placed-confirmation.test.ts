/**
 * The subscriber sends it.
 *
 * **This file exists because `order-confirmation.test.ts` could otherwise be
 * dead code.** Every assertion there drives `buildOrderConfirmation` directly,
 * and a subscriber that built the message and dropped it would pass them all.
 * C8 learned the same lesson about the notification module never registering.
 *
 * The subscriber is an ordinary async function over an event and a container,
 * so it is called with fakes. What it reads from `process.env` is set here,
 * because `sendConfirmation` assembles the runtime configuration itself —
 * there is no request to be handed one by.
 */

import { BigNumber } from "@medusajs/framework/utils";

import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  async function run(
    environment: Record<string, string>,
    orderEmail: string | null = "buyer@example.test",
    // A wrapper object, not a bare `total` with a default: a default parameter
    // fires on an explicitly passed `undefined` as well as an omitted one, and
    // one of the refusal cases below is exactly an order whose total is
    // undefined. Key presence is what distinguishes them.
    money: { readonly total: unknown } | null = null,
    // LD-04 P6a. Which lines the order has, when a case is about that rather
    // than about money.
    items: readonly Record<string, unknown>[] | null = null,
  ) {
    const orderTotal = money === null ? new BigNumber(25) : money.total;
    const original = { ...process.env };
    const notifications: Record<string, unknown>[] = [];
    const issued: Record<string, unknown>[] = [];
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
        total: orderTotal,
        created_at: "2026-09-06T10:00:00.000Z",
        metadata: {},
        // LD-04 P6a. The line carries its own total, deliberately different
        // from the order's: that difference is what a mug in the cart looks
        // like, and the two numbers are for two different documents. The § 55
        // confirmation records what was paid for the *order*; the certificate
        // records what was paid for the *certificate*.
        items: items ?? [
          { title: "Lousy Deal Pro", product_handle: "lousy-deal-pro", total: 5, detail: { quantity: 1 } },
        ],
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
              issueDeal: async (input: Record<string, unknown>) => {
                issued.push(input);
                return {
                  id: "deal_1",
                  order_id: "order_01",
                  serial: 4102,
                  public_slug: "xbts2k3mmv3trv3n",
                };
              },
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

    return { notifications, errors, infos, issued };
  }

  describe("which line the certificate is, and what it cost", () => {
    /**
     * **Constraint 10, and the lie this row exists to remove.** Before LD-04's
     * P6a the subscriber set `amountPaid` from `order.total`, which was the
     * same number while a cart could hold only one thing. A cart may now hold
     * a mug: a $5 certificate bought beside a $15 mug would have printed $20
     * on the certificate and added $20 to the public counter — a fabricated
     * transaction total, on the two surfaces §11 exists to protect.
     */
    it("certifies what the certificate cost, not what the order cost", async () => {
      const { issued, errors } = await run(ENVIRONMENT, "buyer@example.test");
      expect(errors).toEqual([]);
      // The fixture's order totals 25 and its certificate line 5.
      expect(issued).toHaveLength(1);
      expect(issued[0]?.amountPaid).toBe(5);
    });

    it("still names the tier from the line's own title", async () => {
      const { issued } = await run(ENVIRONMENT, "buyer@example.test");
      expect(issued[0]?.tier).toBe("Lousy Deal Pro");
    });

    it("finds the certificate among merch lines rather than requiring it to be alone", async () => {
      const { issued, errors } = await run(ENVIRONMENT, "buyer@example.test", null, [
        { title: "This Mug Cost Extra", product_handle: "this-mug-cost-extra", total: 15, detail: { quantity: 1 } },
        { title: "Lousy Deal", product_handle: "lousy-deal", total: 5, detail: { quantity: 1 } },
        { title: "Certified Worthless", product_handle: "certified-worthless", total: 6, detail: { quantity: 3 } },
      ]);
      expect(errors).toEqual([]);
      expect(issued).toHaveLength(1);
      expect(issued[0]).toMatchObject({ tier: "Lousy Deal", amountPaid: 5 });
    });

    it("matches on the title too, because Medusa's product_handle is nullable", async () => {
      const { issued } = await run(ENVIRONMENT, "buyer@example.test", null, [
        { title: "Lousy Deal Pro", total: 25, detail: { quantity: 1 } },
      ]);
      expect(issued[0]).toMatchObject({ tier: "Lousy Deal Pro", amountPaid: 25 });
    });

    it("issues nothing for an order with no certificate, and says so loudly", async () => {
      // **Inverted on 2026-09-09.** This asserted `errors` was empty, because
      // a merch-only cart was a shape the shop admitted and reporting it would
      // "fill the log with the shop working". Merch is an upsell now, so no
      // payable cart reaches here without a certificate -- and one that does
      // is a paid order issuing nothing, which is exactly what an operator has
      // to be told about.
      //
      // A log line and not a throw: `POST /store/carts/:id/line-items` is
      // public, so the state stays reachable by anyone who wants it.
      const { issued, errors } = await run(ENVIRONMENT, "buyer@example.test", null, [
        { title: "This Mug Cost Extra", product_handle: "this-mug-cost-extra", total: 15, detail: { quantity: 1 } },
      ]);
      expect(issued).toEqual([]);
      expect(errors.join(" ")).toContain("carries no certificate");
      expect(errors.join(" ")).toMatch(/no § 55 confirmation sent/);
    });

    it("refuses two certificates, which have no single tier to put on a document", async () => {
      // §16 gives a deal one `order_id` and no line reference. This refusal is
      // unchanged by LD-04; only "more than one line" stopped being the test.
      const { issued, errors } = await run(ENVIRONMENT, "buyer@example.test", null, [
        { title: "Lousy Deal", product_handle: "lousy-deal", total: 5, detail: { quantity: 1 } },
        { title: "Lousy Deal Pro", product_handle: "lousy-deal-pro", total: 25, detail: { quantity: 1 } },
      ]);
      expect(issued).toEqual([]);
      expect(errors.join(" ")).toContain("certificate=unreadable");
    });

    it("refuses a certificate line of more than one, which is two by another route", async () => {
      const { issued, errors } = await run(ENVIRONMENT, "buyer@example.test", null, [
        { title: "Lousy Deal", product_handle: "lousy-deal", total: 10, detail: { quantity: 2 } },
      ]);
      expect(issued).toEqual([]);
      expect(errors.join(" ")).toContain("certificate=unreadable");
    });
  });

  describe("the shape money arrives in", () => {
    /**
     * **This is the test C15's Gate E order should not have had to be.**
     *
     * `amount()` accepted a number or a numeric string, and every fixture in
     * this repository supplied a number -- so the whole suite passed while the
     * subscriber skipped every real order with `total=none`, issuing no deal,
     * no certificate and no § 55 confirmation for an order that had taken the
     * money. Measured against the running backend: `query.graph` returns
     * `total` as a `BigNumber` instance whose own keys are `numeric_`, `raw_`
     * and `bignumber_`.
     *
     * The real class, imported from `@medusajs/framework/utils`, not a stub
     * shaped like it -- a hand-rolled object is what a test would agree with
     * while Medusa handed over something else.
     *
     * **These are about the § 55 confirmation, which is about the order.**
     * LD-04 P6a moved the *certificate's* amount onto its own line — a
     * different number for a different document — and `issues a certificate
     * for what the certificate cost` below is where that is asserted.
     */
    it.each([
      ["a BigNumber, which is what Medusa actually sends", new BigNumber(25), 25],
      ["a plain number", 25, 25],
      ["a numeric string", "25", 25],
      ["a BigNumber of zero", new BigNumber(0), 0],
    ])("reads a total from %s", async (_name, total, expected) => {
      const { notifications, errors } = await run(ENVIRONMENT, "buyer@example.test", { total });
      expect(errors).toEqual([]);
      expect(notifications).toHaveLength(1);
      const text = String((notifications[0]?.content as { text?: string })?.text ?? "");
      expect(text).toContain(`$${expected.toFixed(2)}`);
    });
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["an array, which Number() would otherwise read as 0", []],
      ["a plain object with no numeric value", { nope: true }],
      ["a negative amount", -1],
    ])("refuses to issue a deal on %s rather than inventing one", async (_name, total) => {
      const { errors, notifications } = await run(ENVIRONMENT, "buyer@example.test", { total });
      expect(notifications).toEqual([]);
      expect(errors.join(" ")).toMatch(/deal issuance skipped/);
      expect(errors.join(" ")).toContain("total=none");
    });
  });

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
                    total: new BigNumber(25),
                    created_at: "2026-09-06T10:00:00.000Z",
                    metadata: {},
                    items: [{ title: "Lousy Deal Pro", product_handle: "lousy-deal-pro", total: 2500, detail: { quantity: 1 } }],
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

describe("which item the § 55 confirmation names", () => {
  /**
   * **Gate D found it reading `items[0]`.** `certificateLine` goes to the
   * trouble of deciding which line is the certificate — and `sendConfirmation`
   * read the first line instead, a leftover from when there was only ever one.
   *
   * With the upsell appending merch, a buyer who added a mug before a
   * certificate got a statutory confirmation reading `ITEM: This Mug Cost
   * Extra` beside the certificate's own serial.
   *
   * The subscriber cannot be driven here — `order-placed.ts`'s own header says
   * why — so what is asserted is that the value handed to the builder comes
   * from the line the subscriber identified, and not from the order's first.
   */
  const source = readFileSync(join(__dirname, "../src/subscribers/order-placed.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("passes the certificate's own tier into the confirmation", () => {
    expect(source).toMatch(/sendConfirmation\(\{[^}]*tier: line\.tier/);
  });

  it("no longer reads the order's first line for it", () => {
    expect(source).not.toMatch(/tier: text\(order\.items\?\.\[0\]\?\.title\)/);
  });

  it("builds the message from the parameter rather than from the order again", () => {
    const send = source.slice(source.indexOf("async function sendConfirmation"));
    expect(send).toMatch(/^\s*tier,$/m);
    expect(send).not.toMatch(/items\?\.\[0\]/);
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    expect(source).toContain("export default async function orderPlaced");
  });
});
