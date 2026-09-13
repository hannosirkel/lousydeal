import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("legal pages opt out of edge transformations", () => {
  it("keeps legal HTML private and uncacheable while adding no-transform", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toEqual([
      {
        source: "/legal/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate, no-transform",
          },
        ],
      },
    ]);
  });
});
