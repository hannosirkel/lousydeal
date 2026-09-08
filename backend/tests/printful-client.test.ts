/**
 * The Printful client: what it sends, what it retries, and what it never says.
 *
 * Driven with a stub `fetch` and a stub clock, so every case below runs in
 * microseconds and none of them touches Printful. The client knows nothing
 * about the catalogue, which is what makes that possible — P4 owns mugs.
 */

import { describe, expect, it } from "vitest";

import { createPrintfulClient, PrintfulError } from "../src/modules/printful/client";

/** A token no real store would issue, so a leak is unmistakable in a failure. */
const TOKEN = "tok-CANARY-must-never-appear-in-an-error";

interface Call {
  readonly url: string;
  readonly method: string;
  readonly authorization: string | undefined;
  readonly body: string | undefined;
}

/** A `fetch` that answers from a script and records what it was asked. */
function stub(...responses: ReadonlyArray<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  const calls: Call[] = [];
  let index = 0;
  const fetch = ((url: string, init: RequestInit) => {
    const headers = new Headers(init.headers as Record<string, string>);
    calls.push({
      url,
      method: init.method ?? "GET",
      authorization: headers.get("authorization") ?? undefined,
      body: typeof init.body === "string" ? init.body : undefined,
    });
    const next = responses[Math.min(index, responses.length - 1)]!;
    index += 1;
    return Promise.resolve(
      new Response(next.body === undefined ? "" : JSON.stringify(next.body), {
        status: next.status,
        headers: { "content-type": "application/json", ...(next.headers ?? {}) },
      }),
    );
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

const waits: number[] = [];
const clock = (milliseconds: number): Promise<void> => {
  waits.push(milliseconds);
  return Promise.resolve();
};
const client = (
  responses: ReadonlyArray<{ status: number; body?: unknown; headers?: Record<string, string> }>,
  attempts = 3,
) => {
  waits.length = 0;
  const { fetch, calls } = stub(...responses);
  return { calls, api: createPrintfulClient({ token: TOKEN, fetch, sleep: clock, attempts }) };
};

describe("what it sends", () => {
  it("puts the token in one header and nowhere else", async () => {
    const { api, calls } = client([{ status: 200, body: { data: [] } }]);
    await api.request("GET", "/v2/orders");
    expect(calls[0]?.authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls[0]?.url).toBe("https://api.printful.com/v2/orders");
    expect(calls[0]?.url).not.toContain(TOKEN);
  });

  it("sends a JSON body only when there is one", async () => {
    const { api, calls } = client([{ status: 200, body: {} }, { status: 200, body: {} }]);
    await api.request("GET", "/v2/orders");
    await api.request("POST", "/store/products", { sync_product: { name: "x" } });
    expect(calls[0]?.body).toBeUndefined();
    expect(calls[1]?.body).toBe('{"sync_product":{"name":"x"}}');
  });

  it("returns the parsed payload, whichever version answered", async () => {
    // v1 answers `{code, result}` and v2 `{data}`. The client hands both back
    // untouched -- reshaping them here would be a second place that has to
    // know which endpoint is which version.
    const v1 = client([{ status: 200, body: { code: 200, result: { id: 1 } } }]);
    expect(await v1.api.request("GET", "/store/products")).toEqual({ code: 200, result: { id: 1 } });
    const v2 = client([{ status: 200, body: { data: [{ id: 2 }] } }]);
    expect(await v2.api.request("GET", "/v2/orders")).toEqual({ data: [{ id: 2 }] });
  });

  it("does not double a slash when the base URL has a trailing one", async () => {
    const { fetch, calls } = stub({ status: 200, body: {} });
    const api = createPrintfulClient({ token: TOKEN, fetch, baseUrl: "https://example.test/" });
    await api.request("GET", "/v2/orders");
    expect(calls[0]?.url).toBe("https://example.test/v2/orders");
  });

  it("refuses to exist without a token", () => {
    expect(() => createPrintfulClient({ token: "   " })).toThrow(/needs a token/);
  });
});

describe("what it retries", () => {
  it("tries again after a 429, which is the failure this is for", async () => {
    // Measured during LD-04's mockup generation: Printful answered 429 with
    // "Please try again after 50 seconds" and the next call succeeded.
    const { api, calls } = client([
      { status: 429, body: { error: { message: "too many requests" } } },
      { status: 200, body: { data: "ok" } },
    ]);
    expect(await api.request("GET", "/v2/orders")).toEqual({ data: "ok" });
    expect(calls).toHaveLength(2);
  });

  it("tries again after a 500", async () => {
    const { api, calls } = client([{ status: 500 }, { status: 200, body: { data: "ok" } }]);
    await api.request("GET", "/v2/orders");
    expect(calls).toHaveLength(2);
  });

  it("does not retry a 400 or a 403, because waiting fixes neither", async () => {
    // LD-04 began with a token carrying only `orders/read`, and every call it
    // could not make answered 403 instantly. Retrying would have turned a
    // clear failure into a slow one.
    for (const status of [400, 403, 404, 410]) {
      const { api, calls } = client([{ status, body: { error: { message: "no" } } }]);
      await expect(api.request("GET", "/store/products")).rejects.toThrow(PrintfulError);
      expect(`${String(status)}: ${String(calls.length)}`).toBe(`${String(status)}: 1`);
    }
  });

  it("stops after the attempt budget and throws the last failure", async () => {
    const { api, calls } = client([{ status: 503, body: { error: "down" } }], 3);
    await expect(api.request("GET", "/v2/orders")).rejects.toThrow(/503/);
    expect(calls).toHaveLength(3);
  });

  it("still makes one request when the budget is zero or negative", async () => {
    // **Found by mutation.** Without the floor the loop body never runs, so
    // the client throws a `PrintfulError` with status 0 having called nothing
    // -- a failure that looks like Printful refused when Printful was never
    // asked. Worse than a slow retry, because it is a lie about what happened.
    for (const attempts of [0, -1]) {
      const { api, calls } = client([{ status: 200, body: { data: "ok" } }], attempts);
      expect(await api.request("GET", "/v2/orders")).toEqual({ data: "ok" });
      expect(`${String(attempts)}: ${String(calls.length)}`).toBe(`${String(attempts)}: 1`);
    }
  });

  it("never retries when the budget is one", async () => {
    const { api, calls } = client([{ status: 429 }], 1);
    await expect(api.request("GET", "/v2/orders")).rejects.toThrow(PrintfulError);
    expect(calls).toHaveLength(1);
  });

  it("honours Retry-After, because Printful knows when its own limiter resets", async () => {
    const { api } = client([
      { status: 429, headers: { "retry-after": "50" }, body: {} },
      { status: 200, body: {} },
    ]);
    await api.request("GET", "/v2/orders");
    expect(waits).toEqual([50_000]);
  });

  it("backs off exponentially when it is not told", async () => {
    const { api } = client([{ status: 500 }], 4);
    await expect(api.request("GET", "/v2/orders")).rejects.toThrow(PrintfulError);
    expect(waits).toEqual([1000, 2000, 4000]);
  });

  it("caps the wait, so a hostile header cannot hang an order", async () => {
    const { api } = client([{ status: 429, headers: { "retry-after": "86400" } }, { status: 200, body: {} }]);
    await api.request("GET", "/v2/orders");
    expect(waits).toEqual([60_000]);
  });

  it("ignores a Retry-After that is not a number", async () => {
    const { api } = client([{ status: 429, headers: { "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" } }, { status: 200, body: {} }]);
    await api.request("GET", "/v2/orders");
    expect(waits).toEqual([1000]);
  });
});

describe("what it says when it fails", () => {
  it("names the method, the path and the status", async () => {
    const { api } = client([{ status: 422, body: { error: { message: "Invalid file URL" } } }]);
    await expect(api.request("POST", "/v2/files")).rejects.toThrow(
      "Printful POST /v2/files failed with 422: Invalid file URL",
    );
  });

  it("reads the detail out of either API version's shape", async () => {
    const shapes: ReadonlyArray<readonly [unknown, string]> = [
      // v2: `{error: {message}}`
      [{ error: { message: "v2 detail" } }, "v2 detail"],
      // v1: `{code, result, error: {message}}`
      [{ code: 403, result: "v1 detail", error: { message: "v1 message" } }, "v1 message"],
      // v1 sometimes puts the human-readable failure only in `result`.
      [{ code: 403, result: "scope missing" }, "scope missing"],
      // v2 sometimes puts a bare string in `data`.
      [{ data: "Not found" }, "Not found"],
      // A bare string where an object belongs.
      [{ error: "flat" }, "flat"],
    ];
    for (const [body, detail] of shapes) {
      const { api } = client([{ status: 400, body }], 1);
      await expect(api.request("GET", "/x")).rejects.toThrow(new RegExp(`400: ${detail}$`));
    }
  });

  it("survives a body that is not JSON, and a body that is null", async () => {
    // The one thing worse than an unhelpful error is a TypeError thrown while
    // building one, which replaces the real failure with a bug in the error
    // path. Both of these produced that in an earlier draft.
    for (const body of [undefined, null, "plain text", 7, []]) {
      const { api } = client([{ status: 500, body }], 1);
      await expect(api.request("GET", "/x")).rejects.toThrow(PrintfulError);
    }
  });

  it("carries the status, method and path as properties", async () => {
    const { api } = client([{ status: 404, body: { error: "gone" } }], 1);
    await api.request("DELETE", "/store/products/1").catch((error: unknown) => {
      expect(error).toBeInstanceOf(PrintfulError);
      const failure = error as PrintfulError;
      expect(failure.status).toBe(404);
      expect(failure.method).toBe("DELETE");
      expect(failure.path).toBe("/store/products/1");
    });
    expect.assertions(4);
  });
});

describe("the token never leaves this module", () => {
  /**
   * **The failure this guards is silent until it is not**: a stack trace in a
   * log aggregator, a thrown object serialised into an error report. The token
   * is planted with a recognisable value, and every reachable surface of a
   * failure is searched for it.
   */
  it("appears in no message, no property, and no serialisation of a failure", async () => {
    const { api } = client([{ status: 401, body: { error: { message: "unauthorized" } } }], 1);
    const failure = await api.request("GET", "/v2/orders").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PrintfulError);
    const surfaces = [
      (failure as Error).message,
      (failure as Error).stack ?? "",
      String(failure),
      JSON.stringify(failure),
      JSON.stringify(Object.entries(failure as object)),
      Object.getOwnPropertyNames(failure).join(" "),
    ];
    for (const [index, surface] of surfaces.entries()) {
      expect(`${String(index)}: ${surface.includes(TOKEN) ? "LEAKED" : "clean"}`).toBe(`${String(index)}: clean`);
    }
  });

  it("puts it in the Authorization header and in no other part of the request", async () => {
    const { api, calls } = client([{ status: 200, body: {} }]);
    await api.request("POST", "/store/products", { name: "x" });
    const call = calls[0]!;
    expect(call.authorization).toContain(TOKEN);
    expect(`${call.url} ${call.method} ${call.body ?? ""}`).not.toContain(TOKEN);
  });
});
