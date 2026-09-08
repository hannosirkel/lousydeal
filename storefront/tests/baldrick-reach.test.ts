/**
 * Where Baldrick is, and — more importantly — where he is not.
 *
 * **The negative is the reason this file exists.** Adding a character to a page
 * is a decision somebody makes on purpose; putting him on a page nobody
 * intended is what happens when a component drifts into a layout. The list of
 * pages he must never reach is longer than the list he is on, and every entry
 * on it was argued rather than inherited:
 *
 *  - **not the layout**, which would put a client component on the certificate
 *    — a page people screenshot and share, and the one surface LD-02 spent six
 *    rows keeping free of anything that is not the document;
 *  - **not `/checkout`**. A character offering opinions beside the consent
 *    checkbox this site's whole legal position rests on is the second-worst
 *    idea in this slice;
 *  - **not `/legal/`**, which is the worst one. Baldrick beside a statutory
 *    text is a trader appearing to gloss its own terms, and his own guards ban
 *    him from saying anything legal precisely because that reading is
 *    available;
 *  - **not `/done-deals/`** and **not `/design/certificate`** — the specimen is
 *    a certificate too.
 *
 * **The routes are named, not described.** "The offer page" is ambiguous on a
 * site with a purchase order at `/` and a quotation at `/deal/[handle]`, and an
 * ambiguous rule is one a later row resolves in whichever direction is
 * convenient.
 *
 * **LD-06's adjacency, recorded here because it is a constraint and not a
 * feature.** LD-06's code entry will live at the cart. A Baldrick reachable
 * only from the home page would make that flow "get a code, then go and find
 * somewhere to type it". He is on the cart today, which is why this row does
 * not build for LD-06 and does not need to — but if a later row narrows this
 * list, that is the sentence it has to answer.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Baldrick } from "../src/components/baldrick/Baldrick";

const appDir = fileURLToPath(new URL("../src/app", import.meta.url));

/** Every route file and every layout under `src/app`, by its path from `app/`. */
const routes: ReadonlyArray<readonly [string, string]> = readdirSync(appDir, {
  recursive: true,
  encoding: "utf8",
})
  .filter((entry) => /(?:^|\/)(?:page|layout|template|not-found|error|global-error)\.tsx$/.test(entry))
  .sort()
  .map((entry) => [entry, readFileSync(`${appDir}/${entry}`, "utf8")] as const);

const mounts = routes.filter(([, source]) => /<Baldrick\b/.test(source)).map(([entry]) => entry);

/**
 * The three, named.
 *
 * A purchase order, a quotation, and the cart. All three are places somebody is
 * deciding whether to buy, which is the only place a sales assistant belongs.
 */
const EXPECTED = ["cart/page.tsx", "deal/[handle]/page.tsx", "page.tsx"];

describe("the scan itself", () => {
  it("finds the routes it claims to be scanning", () => {
    // A guard whose glob has stopped matching passes by finding nothing, which
    // is the failure mode of every list-based guard in this repository.
    const found = routes.map(([entry]) => entry);
    expect(found).toContain("page.tsx");
    expect(found).toContain("layout.tsx");
    expect(found).toContain("checkout/page.tsx");
    expect(found).toContain("legal/terms/page.tsx");
    expect(found).toContain("design/certificate/page.tsx");
    expect(found.length).toBeGreaterThanOrEqual(12);
  });
});

describe("where he is", () => {
  it("is on exactly the three pages this row names", () => {
    expect(mounts).toEqual(EXPECTED);
  });

  it("imports him on every page that renders him", () => {
    // A `<Baldrick />` with no import does not compile, so this is belt on a
    // brace -- but it also catches the inverse, an import left behind by a
    // removal, which does compile and reads as intent.
    for (const [entry, source] of routes) {
      const imports = /from "[./]*components\/baldrick\/Baldrick"/.test(source);
      expect(`${entry}: imports=${String(imports)}`).toBe(`${entry}: imports=${String(mounts.includes(entry))}`);
    }
  });

  it("is on both of the cart page's returns, including the empty one", () => {
    // A cart with nothing in it is where somebody is most likely to have a
    // question. The file has two `<main>`s and a scan that counts files would
    // not see the difference.
    const cart = readFileSync(`${appDir}/cart/page.tsx`, "utf8");
    expect(cart.match(/<Baldrick \/>/g) ?? []).toHaveLength(2);
  });
});

describe("where he is not", () => {
  it.each(routes.filter(([entry]) => !EXPECTED.includes(entry)))("%s does not render him", (_entry, source) => {
    expect(source).not.toMatch(/<Baldrick\b/);
  });

  it("is not in the layout, so he cannot arrive on a page by inheritance", () => {
    // The single most likely way this list becomes wrong: somebody mounts him
    // once, globally, and every page gains a character including the four legal
    // documents and the certificate.
    expect(readFileSync(`${appDir}/layout.tsx`, "utf8")).not.toMatch(/Baldrick/);
  });

  it("is not on the checkout, the legal documents, the record, or the specimen", () => {
    // Named individually rather than left to the `it.each` above, because these
    // five are the decisions and the rest are merely consequences. A reviewer
    // reading this file should see the four arguments, not infer them from an
    // absence.
    for (const route of [
      "checkout/page.tsx",
      "legal/terms/page.tsx",
      "legal/privacy/page.tsx",
      "legal/refunds/page.tsx",
      "legal/imprint/page.tsx",
      "legal/withdraw/page.tsx",
      "legal/page.tsx",
      "done-deals/[slug]/page.tsx",
      "design/certificate/page.tsx",
    ]) {
      const source = routes.find(([entry]) => entry === route)?.[1];
      expect(`${route}: ${String(source !== undefined && !/<Baldrick\b/.test(source))}`).toBe(`${route}: true`);
    }
  });

  it("is not in the certificate the buyer receives", () => {
    // The PDF is generated in the backend and shares no component tree with
    // this app, but the claim is worth an assertion rather than an argument:
    // the certificate is the thing somebody paid for.
    const pdf = fileURLToPath(new URL("../../backend/src", import.meta.url));
    const sources = readdirSync(pdf, { recursive: true, encoding: "utf8" }).filter((entry) => entry.endsWith(".ts"));
    for (const entry of sources) {
      expect(`${entry}: ${String(!/Baldrick/i.test(readFileSync(`${pdf}/${entry}`, "utf8")))}`).toBe(`${entry}: true`);
    }
  });
});

describe("with scripting off, he is not there at all", () => {
  it("renders nothing on the server, whichever page mounts him", () => {
    // **This is the served-HTML property, proven where it holds rather than
    // where it is observed.** React cannot run an effect during a server
    // render, so `mounted` is false for every page, on every request, always.
    // A browser with scripting off displays exactly the served HTML — so an
    // empty server render *is* the absence, and it is stronger than one curl
    // against one route, which could only ever sample.
    //
    // `brand.md` §6: a control that does nothing is a lie, and a chat box that
    // cannot send is one. This is the assertion behind that sentence.
    expect(renderToStaticMarkup(createElement(Baldrick))).toBe("");
  });

  it("gates nothing, so each page he is on still sells with scripting off", () => {
    // The second of §6's two bounds on this exception. The only thing the
    // contract has him unlock is Enterprise, which §10 defers out of V1.
    //
    // **The first draft of this asserted a position** — that no purchase
    // control appears after the `<Baldrick />` in the file — and failed on a
    // correct file, because `cart/page.tsx` has two components and the empty
    // one comes first. It was also vacuous: `<Baldrick />` is self-closing, so
    // nothing can be nested inside it and there was never anything to find.
    //
    // The property instead: each of the three keeps a server-rendered purchase
    // control of its own, which is what "he gates nothing" actually means.
    const controls: ReadonlyArray<readonly [string, RegExp]> = [
      ["page.tsx", /<OrderForm\b/],
      ["deal/[handle]/page.tsx", /<OrderForm\b/],
      ["cart/page.tsx", /<Button href="\/checkout">/],
    ];
    for (const [entry, control] of controls) {
      const source = readFileSync(`${appDir}/${entry}`, "utf8");
      expect(`${entry}: ${String(control.test(source))}`).toBe(`${entry}: true`);
    }
  });

  it("is the only client component any of those three pages pulls in", () => {
    // If a page mounted a second one, "scripting off still sells" would stop
    // being a property of this row and start being a property of that one.
    for (const entry of EXPECTED) {
      const source = readFileSync(`${appDir}/${entry}`, "utf8");
      const local = [...source.matchAll(/from "([./][^"]*)"/g)].map(([, path]) => path);
      const clients = local.filter((path) => {
        const resolved = `${appDir}/${entry.split("/").slice(0, -1).join("/")}/${path}.tsx`.replace(/\/+/g, "/");
        try {
          return readFileSync(resolved, "utf8").startsWith('"use client"');
        } catch {
          return false;
        }
      });
      // Exactly one, and it is him. An empty list would mean the resolution
      // above silently found nothing and the guard was checking a null set --
      // which is what it did until this assertion was tightened.
      expect(`${entry}: ${clients.join(",")}`).toBe(
        `${entry}: ${"../".repeat(entry.split("/").length)}components/baldrick/Baldrick`,
      );
    }
  });
});
