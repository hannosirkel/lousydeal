/**
 * The surcharge goes on the certificate it was priced against, and nowhere
 * else.
 *
 * LD-06 D2. A surcharge is an order line with no variant (constraint 6), and
 * the operator's decision of 2026-09-10 puts it *inside* the certificate's
 * amount: a $5 certificate bought with `BALDRICK20` reads `$6.00`, and the
 * counter adds $6. It is a percentage of the certificate line only, so a mug
 * beside it changes nothing, and it is never `order.total`, which would put
 * that mug on the certificate — LD-04's constraint 10, still.
 *
 * Driven through the subscriber with fakes, as `order-placed-confirmation.test.ts`
 * does, and with the money shaped as Medusa sends it: `BigNumber` instances,
 * not the plain numbers that let C15's Gate E defect through.
 */

import { BigNumber } from "@medusajs/framework/utils";

import { describe, expect, it, vi } from "vitest";

import { MERCHANT_ENVIRONMENT_VARIABLES, type MerchantIdentity } from "../src/config/merchant";
import { SURCHARGE_INTERNAL_TYPE } from "../src/commerce/surcharge";
import { PRODUCT_TIERS } from "../src/commerce/product-model";
import { printfulSubmissionFrom } from "../src/modules/printful/from-order";

const MERCHANT: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
  phoneNumber: "+372 00 00000",
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
  SITE_BASE_URL: "https://lousydeal.example",
  SMTP_HOST: "mail.example.test",
  SMTP_PORT: "587",
  SMTP_USERNAME: "mail-user",
  SMTP_PASSWORD: "mail-password",
  SMTP_FROM_NAME: "Lousy Deal",
  SMTP_ENVELOPE_FROM: "orders@example.test",
  ...Object.fromEntries(
    Object.entries(MERCHANT_ENVIRONMENT_VARIABLES).map(([field, name]) => [name, MERCHANT[field as keyof MerchantIdentity]]),
  ),
};

/** A line as `query.graph` returns it, with the money and the count hydrated as `BigNumber`. */
type Line = Record<string, unknown>;

const certificate = (handle: string, title: string, total: number, quantity = 1): Line => ({
  title,
  product_handle: handle,
  variant_id: `variant_${handle}`,
  variant_sku: null,
  metadata: null,
  total: new BigNumber(total),
  detail: { quantity: new BigNumber(quantity) },
});

/** D1's line, as `addToCartWorkflow` stores it and `prepareLineItemData` copies it onto the order: no variant, no handle. */
const surcharge = (code: string, total: number, quantity = 1): Line => ({
  title: `Discount (${code})`,
  product_handle: null,
  variant_id: null,
  variant_sku: null,
  metadata: { internal_type: SURCHARGE_INTERNAL_TYPE, code, base_amount_major: 5, percentage: 20 },
  total: new BigNumber(total),
  detail: { quantity: new BigNumber(quantity) },
});

const mug = (extra: Line = {}): Line => ({
  title: "This Mug Cost Extra",
  product_handle: "this-mug-cost-extra",
  variant_id: "variant_mug",
  variant_sku: "LD-MUG-11",
  metadata: null,
  total: new BigNumber(15),
  detail: { quantity: new BigNumber(1) },
  ...extra,
});

const order = (items: readonly Line[]) => ({
  id: "order_01",
  email: "buyer@example.test",
  currency_code: "usd",
  total: new BigNumber(99),
  created_at: "2026-09-10T10:00:00.000Z",
  metadata: {},
  items,
});

/**
 * Runs the subscriber for one order and reports what it did.
 *
 * `deals` is passed in so a second call can share it: the fake keeps
 * `issue.ts`'s read-first shape, returning the existing row for an order that
 * already has one, which is what a replay meets.
 */
async function run(items: readonly Line[], deals = new Map<string, Record<string, unknown>>()) {
  const original = { ...process.env };
  const issued: Record<string, unknown>[] = [];
  const notifications: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const infos: string[] = [];

  try {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, ENVIRONMENT);
    vi.resetModules();

    const container = {
      resolve: (key: string) => {
        if (key === "logger") return { info: (m: string) => infos.push(m), error: (m: string) => errors.push(m) };
        if (key === "query") return { graph: async () => ({ data: [order(items)] }) };
        if (key === "deal") {
          return {
            issueDeal: async (input: { orderId: string } & Record<string, unknown>) => {
              issued.push(input);
              const existing = deals.get(input.orderId);
              if (existing) return existing;
              const deal = { id: "deal_1", order_id: input.orderId, serial: 4102, public_slug: "xbts2k3mmv3trv3n" };
              deals.set(input.orderId, deal);
              return deal;
            },
          };
        }
        return { createNotifications: async (n: Record<string, unknown>) => notifications.push(n) };
      },
    };

    const imported = (await import("../src/subscribers/order-placed.js")) as unknown as {
      default: (args: unknown) => Promise<void>;
    };
    await imported.default({ event: { data: { id: "order_01" } }, container });
  } finally {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, original);
    vi.resetModules();
  }

  return { issued, notifications, errors, infos, deals };
}

const HANDLES = PRODUCT_TIERS.map((tier) => tier.handle);
const AT = new Date("2026-09-10T10:00:00Z");

describe("what the certificate is issued for", () => {
  it("adds the surcharge to the certificate's amount", async () => {
    const { issued, errors, notifications } = await run([certificate("lousy-deal", "Lousy Deal", 5), surcharge("BALDRICK20", 1)]);
    expect(errors).toEqual([]);
    expect(issued).toHaveLength(1);
    expect(issued[0]).toMatchObject({ tier: "Lousy Deal", amountPaid: 6 });
    // The confirmation's merchandise list excludes a surcharge.
    expect(String((notifications[0]?.content as { text?: string })?.text)).not.toContain("also contained printed goods");
  });

  it("is unmoved by a mug, which still goes to Printful", async () => {
    // The order totals 99 in the fixture, and the mug 15. Neither reaches the
    // certificate: the surcharge is a percentage of the certificate line
    // only, and `order.total` would print a mug on a document about nothing.
    const items = [mug(), certificate("lousy-deal", "Lousy Deal", 5), surcharge("BALDRICK20", 1)];
    const { issued, errors, notifications } = await run(items);
    expect(errors).toEqual([]);
    expect(issued[0]).toMatchObject({ amountPaid: 6 });

    // The parcel and confirmation classify the same ordinary order lines.
    const plan = printfulSubmissionFrom(order(items), HANDLES, AT);
    expect(plan?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 1 }]);
    expect(plan?.unorderable).toBe(0);
    expect(String((notifications[0]?.content as { text?: string })?.text)).toContain("also contained printed goods");
  });

  it("carries a percentage of the $25 tier exactly", async () => {
    const { issued } = await run([certificate("lousy-deal-pro", "Lousy Deal Pro", 25), surcharge("SAVE10", 2.5)]);
    expect(issued[0]).toMatchObject({ tier: "Lousy Deal Pro", amountPaid: 27.5 });
  });

  it("adds in integer cents, so two-decimal amounts do not drift", async () => {
    // 5.1 + 0.2 is 5.300000000000001 in a double. The certificate prints
    // this figure and the counter sums it.
    const { issued } = await run([certificate("lousy-deal", "Lousy Deal", 5.1), surcharge("BALDRICK20", 0.2)]);
    expect(issued[0]?.amountPaid).toBe(5.3);
  });

  it("issues at the certificate's own figure when there is no surcharge, as before", async () => {
    const { issued, errors } = await run([certificate("lousy-deal-pro", "Lousy Deal Pro", 25)]);
    expect(errors).toEqual([]);
    expect(issued[0]).toMatchObject({ amountPaid: 25 });
  });

  it("reads a zero surcharge as a surcharge, not as no surcharge", async () => {
    // `BLACKFRIDAY` is a real code that adds a real $0.00 line. It must pass
    // the quantity and total checks like any other, and add nothing.
    const { issued, errors } = await run([certificate("lousy-deal", "Lousy Deal", 5), surcharge("BLACKFRIDAY", 0)]);
    expect(errors).toEqual([]);
    expect(issued[0]).toMatchObject({ amountPaid: 5 });
  });

  it("reads a line's own quantity where the query did not hydrate a detail", async () => {
    // The fallback `from-order.ts` documents, on both lines this reads.
    const bare = (line: Line): Line => ({
      ...Object.fromEntries(Object.entries(line).filter(([field]) => field !== "detail")),
      quantity: new BigNumber(1),
    });
    const { issued, errors } = await run([
      bare(certificate("lousy-deal", "Lousy Deal", 5)),
      bare(surcharge("BALDRICK20", 1)),
    ]);
    expect(errors).toEqual([]);
    expect(issued[0]).toMatchObject({ amountPaid: 6 });
  });

  it("recomputes the same figure when the event is delivered again", async () => {
    // Issuing once is `issue.ts`'s read-first insert, which the fake mirrors
    // and this does not prove. What is this row's is that a replay hands the
    // deal module the same input and keys the same notification.
    const items = [certificate("lousy-deal", "Lousy Deal", 5), surcharge("BALDRICK20", 1)];
    const first = await run(items);
    const second = await run(items, first.deals);
    expect(second.errors).toEqual([]);
    expect(second.issued[0]).toMatchObject({ amountPaid: 6 });
    expect(second.notifications[0]?.idempotency_key).toBe(first.notifications[0]?.idempotency_key);
  });
});

describe("what is not a surcharge", () => {
  it("is a mug whose metadata claims to be one: it has a variant, so it is posted and not added", async () => {
    // Constraint 6. The public line-item routes let a visitor write metadata
    // onto any line; none of them can take a variant away.
    const claimant = mug({ metadata: { internal_type: SURCHARGE_INTERNAL_TYPE, code: "BALDRICK20" } });
    const items = [certificate("lousy-deal", "Lousy Deal", 5), claimant];
    const { issued, errors } = await run(items);
    expect(errors).toEqual([]);
    expect(issued[0]).toMatchObject({ amountPaid: 5 });
    expect(printfulSubmissionFrom(order(items), HANDLES, AT)?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 1 }]);
  });

  it("is a line whose variant_id was never read, which keeps today's treatment", async () => {
    // `undefined` is "not asked for", not "none". A narrower query or an
    // older fixture must not turn a line into a surcharge by omission.
    const unread = Object.fromEntries(Object.entries(mug()).filter(([field]) => field !== "variant_id"));
    const items = [certificate("lousy-deal", "Lousy Deal", 5), unread];
    const { issued } = await run(items);
    expect(issued[0]).toMatchObject({ amountPaid: 5 });
    expect(printfulSubmissionFrom(order(items), HANDLES, AT)?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 1 }]);
  });
});

describe("what issues nothing", () => {
  it("a surcharge with no certificate, exactly as a mug alone", async () => {
    const { issued, errors } = await run([surcharge("BALDRICK20", 1)]);
    expect(issued).toEqual([]);
    expect(errors.join(" ")).toContain("carries no certificate");
  });

  it("two surcharge lines, and the log says so", async () => {
    // Reachable only by a direct write, and D4 removes before it adds. The
    // certificate cannot say which of two figures it carries.
    const { issued, errors } = await run([
      certificate("lousy-deal", "Lousy Deal", 5),
      surcharge("BALDRICK20", 1),
      surcharge("SAVE10", 0.5),
    ]);
    expect(issued).toEqual([]);
    expect(errors.join(" ")).toContain("certificate=unreadable");
    expect(errors.join(" ")).toMatch(/2 surcharge lines/);
  });

  it("a surcharge of quantity two, and the log says so", async () => {
    // The public update route can change a line's quantity. A line priced as
    // one and charged as two is not a figure this can certify.
    const { issued, errors } = await run([certificate("lousy-deal", "Lousy Deal", 5), surcharge("BALDRICK20", 2, 2)]);
    expect(issued).toEqual([]);
    expect(errors.join(" ")).toContain("certificate=unreadable");
    expect(errors.join(" ")).toMatch(/surcharge quantity/);
  });

  it("a surcharge whose total cannot be read", async () => {
    const { issued, errors } = await run([certificate("lousy-deal", "Lousy Deal", 5), { ...surcharge("BALDRICK20", 1), total: null }]);
    expect(issued).toEqual([]);
    expect(errors.join(" ")).toMatch(/surcharge total/);
  });

  it("names the reason without naming the buyer", async () => {
    const { errors, infos } = await run([certificate("lousy-deal", "Lousy Deal", 5), surcharge("BALDRICK20", 2, 2)]);
    expect([...errors, ...infos].join("\n")).not.toContain("buyer@example.test");
  });
});
