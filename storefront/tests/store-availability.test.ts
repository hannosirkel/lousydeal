import { describe, expect, it } from "vitest";

import { StoreClosedError, assertStoreOpen, readStoreOpen } from "../src/lib/store-availability";

describe("STORE_OPEN", () => {
  it.each([
    [{}, false],
    [{ STORE_OPEN: "" }, false],
    [{ STORE_OPEN: " false " }, false],
    [{ STORE_OPEN: "TRUE" }, false],
    [{ STORE_OPEN: "1" }, false],
    [{ STORE_OPEN: "true " }, false],
    [{ STORE_OPEN: " true" }, false],
    [{ STORE_OPEN: "\ntrue\n" }, false],
    [{ STORE_OPEN: "true" }, true],
  ] as const)("reads %o as %s", (environment, expected) => {
    expect(readStoreOpen(environment)).toBe(expected);
  });

  it("refuses a closed action before it can validate or contact Medusa", () => {
    expect(() => assertStoreOpen({ STORE_OPEN: "false" })).toThrow(StoreClosedError);
    expect(() => assertStoreOpen({ STORE_OPEN: "not-a-boolean" })).toThrow("store_closed");
  });
});
