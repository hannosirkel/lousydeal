/**
 * The gift send: once per gift, never twice, and never instead of the buyer's
 * confirmation.
 *
 * **The replay is driven rather than described.** §16 says "Stripe/webhook
 * retries must not generate duplicate certificates, Printful orders, or
 * gifts", and C2 proved the certificate half by firing the event twice against
 * a store that enforces one constraint. This does the same for the send: a
 * notification module that dedupes on `idempotency_key`, and the subscriber
 * invoked twice with the same order.
 *
 * The fake module is deliberately a working implementation of the one rule
 * that matters rather than a stub that records calls. A stub would let this
 * file assert the key was *passed*, which is not the property — the property
 * is that a second delivery sends nothing.
 */

import { BigNumber } from "@medusajs/framework/utils";
import { describe, expect, it, vi } from "vitest";

import { MERCHANT_ENVIRONMENT_VARIABLES, type MerchantIdentity } from "../src/config/merchant";

const MERCHANT: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example Street 1, Tallinn",
  email: "legal@example.test",
  phoneNumber: "+372 5555 0100",
  registryCode: "12345678",
  vatNumber: "EE123456789",
};

const ENVIRONMENT: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(MERCHANT_ENVIRONMENT_VARIABLES).map(([field, name]) => [
      name,
      MERCHANT[field as keyof MerchantIdentity],
    ]),
  ),
  SITE_BASE_URL: "https://lousydeal.example",
  SMTP_HOST: "mail.example.test",
  SMTP_PORT: "587",
  SMTP_USERNAME: "u",
  SMTP_PASSWORD: "p",
  SMTP_FROM_NAME: "Lousy Deal",
  SMTP_ENVELOPE_FROM: "shop@example.test",
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
};

const GIFT_METADATA = {
  lousydeal_gift_recipient_email: "recipient@example.test",
  lousydeal_gift_recipient_name: "A. Recipient",
  lousydeal_gift_sender_name: "A. Buyer",
  lousydeal_gift_message: "Happy birthday",
};

/**
 * Runs the subscriber `deliveries` times against one order, as a redelivery
 * would, and reports every notification that was actually sent.
 *
 * The deal store and the notification module persist across deliveries,
 * because that is what makes this a replay rather than two unrelated runs.
 */
async function run({
  metadata,
  deliveries = 1,
  giftFails = false,
}: {
  metadata?: Record<string, unknown>;
  deliveries?: number;
  giftFails?: boolean;
}) {
  const original = { ...process.env };
  const sent: { to: string; template: string; key: string | undefined }[] = [];
  const errors: string[] = [];
  const infos: string[] = [];
  /** The one rule that matters, implemented rather than stubbed. */
  const keys = new Set<string>();
  let rows: Record<string, unknown> | null = null;

  try {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, ENVIRONMENT);
    vi.resetModules();

    const order = {
      id: "order_01",
      email: "buyer@example.test",
      currency_code: "usd",
      total: new BigNumber(25),
      created_at: "2026-09-07T10:00:00.000Z",
      metadata: metadata ?? {},
      items: [{ title: "Lousy Deal Pro", detail: { quantity: 1 } }],
    };

    const container = {
      resolve: (key: string) => {
        if (key === "logger") {
          return { info: (m: string) => infos.push(m), error: (m: string) => errors.push(m) };
        }
        if (key === "query") return { graph: async () => ({ data: [order] }) };
        if (key === "deal") {
          return {
            // C2's read-first/insert/read-again, as the module implements it:
            // a replay returns the row rather than minting a second.
            issueDeal: async (input: { gift: Record<string, string> | null }) => {
              rows ??= {
                id: "deal_1",
                order_id: "order_01",
                serial: 4102,
                public_slug: "xbts2k3mmv3trv3n",
                gift_recipient_email: input.gift?.recipientEmail ?? null,
                gift_recipient_name: input.gift?.recipientName ?? null,
                gift_sender_name: input.gift?.senderName ?? null,
                gift_message: input.gift?.message ?? null,
              };
              return rows;
            },
          };
        }
        return {
          createNotifications: async (notification: Record<string, unknown>) => {
            const idempotencyKey = notification.idempotency_key as string | undefined;
            // The module's own rule: an entry whose key already exists is not
            // created and not sent. See
            // `notification-module-service.js:39-75`.
            if (idempotencyKey !== undefined && keys.has(idempotencyKey)) return [];
            if (giftFails && notification.template === "gift-message") {
              throw new Error("the transport refused");
            }
            if (idempotencyKey !== undefined) keys.add(idempotencyKey);
            sent.push({
              to: String(notification.to),
              template: String(notification.template),
              key: idempotencyKey,
            });
            return [];
          },
        };
      },
    };

    // `.js` and an explicit cast, the shape
    // `order-placed-confirmation.test.ts` already uses and for its reason:
    // this workspace emits CommonJS, so under `moduleResolution: node16` tsc
    // models `import("./x.js")` the way Node models a `require` and gives
    // `.default` the module namespace rather than the function.
    const imported = (await import("../src/subscribers/order-placed.js")) as unknown as {
      default: (args: unknown) => Promise<void>;
    };
    const handler = imported.default;
    for (let delivery = 0; delivery < deliveries; delivery += 1) {
      await handler({ event: { data: { id: "order_01" } }, container });
    }
  } finally {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, original);
    vi.resetModules();
  }

  return { sent, errors, infos };
}

describe("a gift order", () => {
  it("sends the buyer's confirmation and the recipient's message, once each", async () => {
    const { sent, errors } = await run({ metadata: GIFT_METADATA });

    expect(errors).toEqual([]);
    expect(sent.map((n) => n.template)).toEqual(["order-confirmation", "gift-message"]);
    expect(sent[0]?.to).toBe("buyer@example.test");
    expect(sent[1]?.to).toBe("recipient@example.test");
  });

  it("sends the confirmation first, because it is the one owed as a duty", async () => {
    // The § 55 confirmation is a legal duty on a deadline; the gift message is
    // a courtesy. The reverse order would mean a stranger heard about the
    // purchase before the buyer got the document the law owes them.
    const { sent } = await run({ metadata: GIFT_METADATA });
    expect(sent.findIndex((n) => n.template === "order-confirmation")).toBeLessThan(
      sent.findIndex((n) => n.template === "gift-message"),
    );
  });

  it("still sends the confirmation when the gift message fails", async () => {
    const { sent, errors } = await run({ metadata: GIFT_METADATA, giftFails: true });

    expect(sent.map((n) => n.template)).toEqual(["order-confirmation"]);
    expect(errors.join(" ")).toMatch(/gift message failed/);
    // And it does not throw: Medusa retries a subscriber that rejects, and a
    // defect failing on every delivery is an event storm.
  });
});

describe("a redelivered event", () => {
  it("sends nothing further, which is what §16 requires", async () => {
    // **Driven, not described.** Three deliveries of the same order; the
    // notification module dedupes on `idempotency_key` exactly as
    // `notification-module-service.js:39-75` does.
    const { sent } = await run({ metadata: GIFT_METADATA, deliveries: 3 });

    expect(sent).toHaveLength(2);
    expect(sent.map((n) => n.template)).toEqual(["order-confirmation", "gift-message"]);
  });

  it("does not send a second § 55 confirmation either", async () => {
    // **A defect this row fixes rather than introduces.** Before G5 nothing
    // stopped a redelivery re-sending the confirmation: the subscriber called
    // `sendConfirmation` unconditionally after issuance, and issuance being
    // idempotent said nothing about the send.
    const { sent } = await run({ deliveries: 4 });

    expect(sent.map((n) => n.template)).toEqual(["order-confirmation"]);
  });

  it("keys both messages on the deal, so the key survives a replay", async () => {
    // `deal.id`, not the order id: the deal is minted once by C2's
    // read-first/insert/read-again, so its id is the stable thing a replay
    // recovers.
    const { sent } = await run({ metadata: GIFT_METADATA, deliveries: 2 });

    expect(sent[0]?.key).toBe("lousydeal:order-confirmation:deal_1");
    expect(sent[1]?.key).toBe("lousydeal:gift-message:deal_1");
  });

  it("gives the two messages different keys, so one does not suppress the other", async () => {
    const { sent } = await run({ metadata: GIFT_METADATA });
    expect(new Set(sent.map((n) => n.key)).size).toBe(2);
  });
});

describe("an ordinary purchase", () => {
  it("sends the confirmation and no gift message", async () => {
    const { sent } = await run({});
    expect(sent.map((n) => n.template)).toEqual(["order-confirmation"]);
  });

  it("sends no gift where the buyer typed one without a usable address", async () => {
    // `readGift` drops the lot: the address is what makes an order a gift, and
    // there is nowhere to send it.
    const { sent } = await run({
      metadata: { ...GIFT_METADATA, lousydeal_gift_recipient_email: "not-an-address" },
    });
    expect(sent.map((n) => n.template)).toEqual(["order-confirmation"]);
  });
});

describe("what the log says", () => {
  it("names the order for each send, and neither address", async () => {
    // The recipient's address is a third party's, which makes it the one piece
    // of personal data in this slice that its subject never gave us.
    const { infos } = await run({ metadata: GIFT_METADATA });

    expect(infos.join(" ")).toContain("gift message sent for order order_01");
    expect(infos.join(" ")).not.toContain("recipient@example.test");
    expect(infos.join(" ")).not.toContain("buyer@example.test");
  });
});
