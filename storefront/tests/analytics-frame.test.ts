import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import { analyticsFrameDocument } from "../src/lib/analytics-frame";

const VALID_CONFIG = { googleTagId: "G-EXAMPLE", metaPixelId: "123456789" };

function start(config: typeof VALID_CONFIG | null = VALID_CONFIG) {
  const commands: unknown[][] = [];
  const appended: Array<Record<string, unknown>> = [];
  const parent = {};
  let listener: (event: unknown) => void = () => undefined;
  const context: Record<string, unknown> = {
    parent: Object.assign(parent, { postMessage: () => undefined }),
    document: {
      createElement: () => ({}),
      head: { append: (script: Record<string, unknown>) => { appended.push(script); } },
    },
    addEventListener: (_: string, fn: typeof listener) => { listener = fn; },
  };
  context.window = context;
  const html = analyticsFrameDocument();
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";
  runInNewContext(script, context);
  if (config !== null) listener({ source: parent, data: { kind: "lousydeal.analytics.configure", ...config } });
  const google = context.dataLayer as { push: (entry: unknown) => void } & Iterable<unknown>;
  const consume = (entry: unknown) => {
    if (Object.prototype.toString.call(entry) === "[object Arguments]") commands.push(Array.from(entry as ArrayLike<unknown>));
  };
  for (const entry of google) consume(entry);
  google.push = consume;
  const fbq = context.fbq as { queue: ArrayLike<unknown>[]; callMethod: (...args: unknown[]) => void; version: string; loaded: boolean } | undefined;
  const meta: unknown[][] = fbq?.queue.map((entry) => Array.from(entry)) ?? [];
  if (fbq) fbq.callMethod = (...args) => { meta.push(args); };
  return { appended, commands, meta, fbq, google, html, send: (data: unknown, source: unknown = parent) => listener({ data, source }) };
}

describe("the isolated analytics frame", () => {
  it("appends fixed no-referrer SDK scripts only after valid configuration", () => {
    const frame = start(null);
    expect(frame.appended).toEqual([]);

    frame.send({ kind: "lousydeal.analytics.configure", ...VALID_CONFIG });

    expect(frame.appended).toEqual([
      {
        async: true,
        referrerPolicy: "no-referrer",
        src: "https://www.googletagmanager.com/gtag/js?id=G-EXAMPLE",
      },
      {
        async: true,
        referrerPolicy: "no-referrer",
        src: "https://connect.facebook.net/en_US/fbevents.js",
      },
    ]);
  });

  it("delivers queued and loaded events using supported SDK command contracts", () => {
    const frame = start();
    frame.send({ kind: "lousydeal.analytics", name: "purchase_completed", payload: { currency: "USD", amount: 500, route_class: "checkout" } });
    expect(frame.commands.find((entry) => entry[0] === "config")?.[2]).toMatchObject({ send_page_view: false, page_location: "https://analytics.invalid/measurement", page_title: "Analytics measurement", page_referrer: "" });
    expect(frame.commands.at(-1)).toEqual(["event", "purchase_completed", { currency: "USD", amount: 500, route_class: "checkout", page_location: "https://analytics.invalid/measurement", page_title: "Analytics measurement", page_referrer: "" }]);
    expect(frame.meta).toContainEqual(["init", "123456789"]);
    expect(frame.meta.at(-1)).toEqual(["trackCustom", "purchase_completed", { currency: "USD", amount: 500, route_class: "checkout" }]);
    expect(frame.fbq?.version).toBe("2.0");
    expect(frame.fbq?.loaded).toBe(true);
  });

  it("rejects forged messages and strips unsafe fields again inside the sandbox", () => {
    const frame = start();
    const count = frame.commands.length;
    frame.send({ kind: "lousydeal.analytics", name: "purchase_completed", payload: {} }, {});
    frame.send({ kind: "lousydeal.analytics", name: "anything", payload: {} });
    expect(frame.commands).toHaveLength(count);
    frame.send({ kind: "lousydeal.analytics", name: "certificate_shared", payload: { page_location: "SECRET", route_class: "SECRET", amount: -1, product_handle: "email@example.com", href: "SECRET" } });
    expect(frame.meta.at(-1)).toEqual(["trackCustom", "certificate_shared", {}]);
  });

  it("does not embed malformed IDs or script terminators", () => {
    const frame = start({ googleTagId: '</script><script>alert("SECRET")', metaPixelId: "123?SECRET" });
    expect(frame.html).not.toContain("SECRET");
  });

  it("keeps the other vendor running when an SDK dispatcher throws", () => {
    const frame = start();
    frame.google.push = () => { throw new Error("blocked SDK"); };
    expect(() => frame.send({ kind: "lousydeal.analytics", name: "purchase_completed", payload: {} })).not.toThrow();
    expect(frame.meta.at(-1)).toEqual(["trackCustom", "purchase_completed", {}]);
  });

  it("does not initialize another vendor on a repeated configuration message", () => {
    const frame = start();
    const count = frame.commands.length;
    frame.send({ kind: "lousydeal.analytics.configure", googleTagId: "G-OTHER123", metaPixelId: "999999999" });
    expect(frame.commands).toHaveLength(count);
    expect(frame.meta.filter((entry) => entry[0] === "init")).toHaveLength(1);
  });
});
