/**
 * The public counter, and the one thing it must never do.
 *
 * Contract §11 names three figures and forbids fabricating a transaction
 * total. `AGENTS.md` is sharper: a public counter reports real orders or does
 * not ship. `brand.md` §4 recorded the deferral this row discharges — "it
 * arrives with LD-02, wired to real orders, or it does not arrive".
 *
 * **The assertion this file exists for is that an unreachable store never
 * renders as zero.** Those are different claims — one is a fact about the
 * shop, the other about the network — and a counter that conflates them
 * publishes a total nobody measured.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Counter } from "../src/components/document/Counter";
import { COUNTER_LABELS, COUNTER_NONE_YET, COUNTER_TITLE } from "../src/content/home";
import { StoreApiError, type FetchJson } from "../src/lib/medusa-client";
import { getDealTotals, type DealTotals } from "../src/lib/store-deal";

const SOLD: DealTotals = { count: 3, amount: 45, currencyCode: "usd", latestSerial: 3 };

const render = (totals: DealTotals) => renderToStaticMarkup(createElement(Counter, { totals }));

/** A stub answering the totals route, or throwing. */
function stub(answer: unknown): FetchJson {
  return (async <T>(): Promise<T> => {
    if (answer instanceof Error) throw answer;
    return answer as T;
  }) as FetchJson;
}

describe("reading the totals", () => {
  it("carries the three figures §11 names", async () => {
    const totals = await getDealTotals(
      stub({ totals: { count: 3, amount: 45, currency_code: "usd", latest_serial: 3 } }),
    );

    expect(totals).toEqual(SOLD);
  });

  it("answers null for any failure, so the page can tell it apart from zero", async () => {
    // Every error, not only a 404: there is no status for which inventing a
    // number is better than showing none.
    const failures = [
      new StoreApiError(500, "/store/deals/totals"),
      new StoreApiError(404, "/store/deals/totals"),
      new Error("socket hang up"),
    ];

    for (const failure of failures) {
      expect(await getDealTotals(stub(failure)), String(failure)).toBeNull();
    }
    // And a response that is not a totals response at all.
    expect(await getDealTotals(stub({}))).toBeNull();
    expect(await getDealTotals(stub({ totals: { count: "3" } }))).toBeNull();
  });

  it("reports a genuine zero as zero, not as a failure", async () => {
    // The distinction the whole row turns on, from the other side: an empty
    // shop is readable and reads as zero.
    const totals = await getDealTotals(
      stub({ totals: { count: 0, amount: null, currency_code: null, latest_serial: null } }),
    );

    expect(totals).toEqual({ count: 0, amount: null, currencyCode: null, latestSerial: null });
    expect(totals).not.toBeNull();
  });
});

describe("the counter", () => {
  it("shows the three figures once there are deals", () => {
    const html = render(SOLD);

    expect(html).toContain(COUNTER_TITLE);
    expect(html).toContain(COUNTER_LABELS.count);
    expect(html).toContain("3");
    expect(html).toContain("$45.00");
    expect(html).toContain("#3");
  });

  it("renders zero rather than hiding until the figures flatter", () => {
    // Most of this shop's life will be spent at zero. A counter that appears
    // only once it is impressive is one lying about its floor.
    const html = render({ count: 0, amount: null, currencyCode: null, latestSerial: null });

    expect(html).toContain(COUNTER_TITLE);
    expect(html).toContain(COUNTER_NONE_YET);
    // No figures at all, rather than "$0.00" and "#0" -- there is no deal
    // number zero and no money was wasted.
    expect(html).not.toContain("$0.00");
    expect(html).not.toContain("#0");
  });

  it("never shows an amount without the currency beside it", () => {
    // A figure with no currency is a number pretending to be a total.
    const html = render({ ...SOLD, currencyCode: null });

    expect(html).not.toContain("45");
    expect(html).toContain(COUNTER_LABELS.count);
  });

  it("shows the latest serial as a serial, and not as the count in disguise", () => {
    // They are equal today and need not stay so: a rolled-back insert consumes
    // a sequence number, so one gap makes the highest serial exceed the number
    // of deals. Reporting one as the other overstates something either way.
    const html = render({ count: 3, amount: 45, currencyCode: "usd", latestSerial: 4102 });

    expect(html).toContain("#4,102");
    expect(html).toContain(">3<");
  });

  it("is labelled for a screen reader rather than being a loose pair of numbers", () => {
    expect(render(SOLD)).toContain('aria-labelledby="counter-title"');
  });
});

describe("the home page's use of it", () => {
  /** Renders the home page against a store that answers, or fails, as given. */
  async function renderHome(totals: DealTotals | null): Promise<string> {
    vi.resetModules();
    vi.doMock("next/server", () => ({ connection: async () => undefined }));
    vi.doMock("../src/lib/store-session", () => ({
      requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
      CART_ID_COOKIE: "lousydeal_cart_id",
      CART_COOKIE_OPTIONS: {},
    }));
    vi.doMock("../src/lib/medusa-client", () => ({
      createStoreFetchJson: () => stub({}),
      listTiers: async () => [
        { id: "v1", title: "Lousy Deal", handle: "lousy-deal", variantId: "var_1", amount: 5, currencyCode: "usd" },
      ],
      getDefaultRegion: async () => ({ id: "reg_1", countries: [] }),
    }));
    vi.doMock("../src/lib/store-deal", () => ({ getDealTotals: async () => totals }));
    vi.doMock("../src/lib/cart-actions", () => ({ addToCart: async () => undefined }));

    const { default: HomePage } = await import("../src/app/page");
    return renderToStaticMarkup(await HomePage());
  }

  it("omits the counter entirely when the figures could not be read", async () => {
    // **The assertion this file exists for.** Rendering `0` here would publish
    // a transaction total nobody measured, which §11 forbids in as many words.
    const html = await renderHome(null);

    expect(html).not.toContain(COUNTER_TITLE);
    expect(html).not.toContain(COUNTER_NONE_YET);
    // The rest of the page is unaffected: a counter that cannot be read must
    // not take the offer down with it.
    expect(html).toContain("Lousy Deal");
  });

  it("shows it when they could, including at zero", async () => {
    const empty = await renderHome({ count: 0, amount: null, currencyCode: null, latestSerial: null });

    expect(empty).toContain(COUNTER_TITLE);
    expect(empty).toContain(COUNTER_NONE_YET);
  });
});
