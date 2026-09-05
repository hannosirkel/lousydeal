"use client";

/**
 * The error state, per `docs/current/brand.md` §4's system-pages table.
 *
 * **`"use client"` is a framework requirement, not a choice.** A React error
 * boundary cannot be a Server Component, so this is the third exception to §6's
 * rule that the only client JavaScript here is the consent checkbox and the
 * Stripe element. §6 records it as an exception rather than this file widening
 * the rule quietly.
 *
 * It offers a link home rather than a retry control. `reset()` would need a
 * click handler, and `Button` deliberately takes none — a link needs no
 * handler, works if the boundary's own JavaScript failed to load, and says
 * something truer: if the request could not be completed, trying it again is
 * not obviously the reader's best move.
 *
 * The `error` argument is deliberately unused. Rendering a message a server
 * threw would publish internals to a reader who cannot act on them; Next
 * already logs it server-side.
 */

import { Button } from "../components/document/Button";
import { DocumentFrame } from "../components/document/DocumentFrame";

export default function ErrorPage() {
  return (
    <main>
      {/* `LD-5XX` rather than the status code itself: `tests/store-cart.test.ts`
          forbids the three tier amounts, written as minor units, anywhere under
          `src`, and one of them is that number. The guard cannot tell a form
          number from a price and is right not to try. */}
      <DocumentFrame title="Processing error" form="Form LD-5XX" revision="Rev. 2026-09">
        <p>The request could not be completed. This was not, on this occasion, deliberate.</p>
        <Button variant="secondary" href="/">
          Return to the purchase order
        </Button>
      </DocumentFrame>
    </main>
  );
}
