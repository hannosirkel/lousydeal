/**
 * The 404, per `docs/current/brand.md` §4's system-pages table.
 *
 * **It exists because V5 made a 404 reachable.** `/deal/[handle]` calls
 * `notFound()` for a handle no tier has, and without this file Next serves its
 * own default: an empty document under server rendering, filled in by client
 * JavaScript into a white — or, under `prefers-color-scheme: dark`, black —
 * page in the UA's default serif, reading "404. This page could not be found."
 * `brand.md` §3 says this identity has no night edition, §6 says the only
 * client JavaScript is the consent checkbox and Stripe, and §2's worked
 * examples name that exact register as the thing not to write.
 *
 * A route file rather than a content module: `tests/tier-page.test.ts` reads
 * `brand.md` and asserts these two strings against it, so the document is the
 * source and this is checked against it rather than beside it.
 *
 * **It fixes the copy everywhere and the empty body only where Next lets it.**
 * Measured against the built server:
 *
 *   /nonexistent  404, full document server-rendered, masthead and footer
 *   /deal/nope    404, `<html id="__next_error__">`, body empty, this
 *                 document present only in the flight payload
 *
 * The difference is when the throw happens. A URL matching no route renders
 * this page as the primary render; `notFound()` from `/deal/[handle]` is
 * thrown after the shell has been flushed, and Next cannot rewind a started
 * response, so it hands the not-found UI to the client. The status is right in
 * both cases and a reader with JavaScript sees this document in both. A reader
 * without it sees a blank page on the thrown one. Recorded in the plan under
 * V5b rather than left for someone to rediscover.
 */

import { DocumentFrame } from "../components/document/DocumentFrame";

export default function NotFound() {
  return (
    <main>
      {/* A form number for a page that is not a form is the joke a filing
          clerk would have made, which is the register §1 asks for. */}
      <DocumentFrame title="Document not found" form="Form LD-404" revision="Rev. 2026-09">
        <p>This page has even less content than our products.</p>
      </DocumentFrame>
    </main>
  );
}
