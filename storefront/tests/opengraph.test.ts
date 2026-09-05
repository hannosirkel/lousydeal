/**
 * The social image, its favicon, and the two things that would break them
 * silently.
 *
 * **A missing font is the failure this row is most likely to ship.** Satori
 * reads the TTFs on the first request, not at build time, so `next build`
 * cannot notice that the Dockerfile forgot to copy `public/`. That is why the
 * Dockerfile line is asserted here rather than trusted: nothing else in the
 * repository fails when it is absent.
 *
 * **Provenance is executed, not asserted.** `src/fonts/plex-mono.ts` already
 * recorded the SHA-256 of the upstream files it subsetted. The TTFs shipped for
 * Satori are those same upstream files, unmodified, so the sums must match the
 * ones that file wrote down — and a font swapped for a lookalike fails here.
 * That also carries the licence argument: unmodified copies may keep the
 * Reserved Font Name, which is why these two are `IBM Plex Mono` while the
 * subsets served to browsers are `LD Mono`.
 *
 * The image is rendered for real. `ImageResponse` is the thing under test, and
 * a test that asserted the JSX would be asserting a re-implementation — which
 * three rows in this slice have already shipped and had to take back.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

// `connection()` marks the route dynamic and throws outside a request scope,
// which a direct call from a test is. Mocking it is the narrowest way to keep
// rendering the real `ImageResponse`; that the route actually calls it is
// asserted separately, against the source, further down.
vi.mock("next/server", () => ({ connection: async () => undefined }));

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)));
const text = (relative: string) => read(relative).toString("utf8");

const FONTS = [
  ["IBMPlexMono-Regular.ttf", "fe11304a5fe956d5744e9b6a246cc83d90425245e75a62230044966ca96a7f50"],
  ["IBMPlexMono-Bold.ttf", "ca403c56931baef307d20ba64b69acb71abcad61f75e66414661d57484b690ec"],
] as const;

describe("the fonts the image renders with", () => {
  it.each(FONTS)("%s is the upstream file, byte for byte", (name, expected) => {
    const actual = createHash("sha256").update(read(`../public/fonts/${name}`)).digest("hex");
    expect(actual).toBe(expected);
  });

  it("matches the sums src/fonts/plex-mono.ts recorded for its own sources", () => {
    // The tie that makes the two directories one decision rather than two.
    // Editing either sum without editing the other fails.
    const provenance = text("../src/fonts/plex-mono.ts");
    for (const [, sum] of FONTS) expect(provenance).toContain(sum);
    expect(provenance).toContain("242c4cccd37e87985a5337815c99b960ef13c65c");
  });

  it("ships the licence beside them", () => {
    // OFL 1.1 clause 2: the copyright notice and licence travel with the files.
    expect(text("../public/fonts/OFL.txt")).toContain("SIL OPEN FONT LICENSE");
  });

  it("is copied into the runtime image, which no build failure would reveal", () => {
    // Satori reads these on the first request. Without the COPY the route
    // throws ENOENT in production and every other check in this repository
    // still passes.
    const dockerfile = text("../Dockerfile");
    expect(dockerfile).toMatch(/COPY --from=build \/src\/storefront\/public \.\/public/);
  });
});

describe("the image", () => {
  it("renders a PNG at exactly 1200×630", async () => {
    // The route reads its fonts from `process.cwd()/public/fonts`, which is
    // right in every place it runs: the standalone image's working directory is
    // `/app`, where the Dockerfile copies `public/`, and `next start` runs from
    // `storefront/`. Only vitest differs, running from the repository root, so
    // the test moves to the directory the module expects rather than the module
    // acquiring a fallback that exists for a test's benefit.
    const storefront = fileURLToPath(new URL("..", import.meta.url));
    const previous = process.cwd();
    process.chdir(storefront);

    const module = (await import("../src/app/opengraph-image").finally(() => {
      process.chdir(previous);
    })) as {
      default: () => Promise<Response>;
      size: { width: number; height: number };
      contentType: string;
      alt: string;
    };

    expect(module.size).toEqual({ width: 1200, height: 630 });
    expect(module.contentType).toBe("image/png");
    expect(module.alt).not.toBe("");

    // No store is reachable here, so this also exercises the outage path: the
    // card must still render, without the two rows that need a figure.
    const response = await module.default();
    expect(response.headers.get("content-type")).toBe("image/png");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(1000);

    // The PNG signature, then IHDR's width and height as big-endian uint32.
    expect([...bytes.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const header = new DataView(bytes.buffer, bytes.byteOffset);
    expect(header.getUint32(16)).toBe(1200);
    expect(header.getUint32(20)).toBe(630);
  }, 30_000);

  it("writes no amount of its own", () => {
    // `tests/store-cart.test.ts` enforces this across `src`; it is repeated
    // here because an image is the easiest place to hard-code a price and the
    // hardest place to notice one.
    const source = text("../src/app/opengraph-image.tsx");
    expect(source).not.toMatch(/[$€£]\s?\d/);
    expect(source).not.toMatch(/\b(?:500|1000|2500)\b/);
  });
});

describe("the favicon", () => {
  it("is the stamp's geometry, not a second drawing of it", () => {
    // StampMark is inline SVG so it can inherit type and colour from CSS. A
    // favicon inherits nothing, so the numbers are written out -- and a copy
    // nobody compares is a copy that drifts.
    const icon = text("../src/app/icon.svg");
    const stamp = text("../src/components/document/StampMark.tsx");
    const css = text("../src/app/globals.css");

    for (const value of ["57", "51"]) {
      expect(stamp).toMatch(new RegExp(`RADIUS = ${value}`));
      expect(icon).toContain(`r="${value}"`);
    }
    expect(stamp).toContain("const SIZE = 120");
    expect(icon).toContain('viewBox="0 0 120 120"');
    expect(css).toContain("stroke-width: 1.5");
    expect(icon).toContain('stroke-width="1.5"');
  });

  it("uses the identity's two colours and introduces none", () => {
    const icon = text("../src/app/icon.svg");
    const colours = [...icon.matchAll(/#[0-9a-f]{6}/gi)].map((match) => match[0].toLowerCase());
    expect([...new Set(colours)].sort()).toEqual(["#b3261e", "#fafaf7"]);
  });

  it("carries an accessible name", () => {
    const icon = text("../src/app/icon.svg");
    expect(icon).toContain("<title>");
    expect(icon).toContain('role="img"');
  });
});

describe("the metadata that points at it", () => {
  it("derives its base from the request rather than naming a host", () => {
    // Global Constraint 2: nothing environment-specific in the built artifact.
    // One image serves the test host and the live one.
    const layout = text("../src/app/layout.tsx");
    expect(layout).toContain("metadataBase");
    expect(layout).toMatch(/headers\(\)/);
    expect(layout).not.toMatch(/https?:\/\/[a-z]/i);
  });

  it("is rendered per request, not baked into the image", () => {
    // Next prerenders an `opengraph-image` by default, and it did: the first
    // build of this row produced a static card with no offer rows, because the
    // build could reach no store. Decision `002` is the rule that breaks --
    // nothing environment-specific in the artifact, and a price is the most
    // environment-specific thing here -- and the card would have been frozen
    // wrong in both environments with nothing failing.
    const route = text("../src/app/opengraph-image.tsx");
    expect(route).toMatch(/await connection\(\)/);
    expect(route).toMatch(/from "next\/server"/);
  });

  it("defaults the scheme to https and omits the base when the host is unknown", () => {
    const layout = text("../src/app/layout.tsx");
    expect(layout).toContain('x-forwarded-proto');
    expect(layout).toMatch(/\?\?\s*"https"/);
    expect(layout).toMatch(/host === null \? \{\} :/);
  });
});
