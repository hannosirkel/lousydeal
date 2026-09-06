/**
 * What a certificate address shows when it carries no certificate.
 *
 * The root `not-found.tsx` would serve here, and its copy is about a page. The
 * person reading this one was almost certainly *sent* a link, and "this page
 * has even less content than our products" answers a question they did not
 * ask. So this route has its own, saying the two things that are useful here:
 * that nothing is filed at this address, and what the two reasons for that
 * are.
 *
 * **It names both possibilities and confirms neither.** An address carries no
 * certificate if it never did — a mistyped link is the commonest way — or if
 * an operator has hidden the one it had. C4 answers both with the same 404 in
 * the same words, because saying which would amount to "there is one here and
 * you may not see it" and make the address enumerable. Saying "either, and we
 * are not telling you which" leaks nothing and is true.
 *
 * **Without JavaScript the body is empty**, and that is Next's behaviour
 * rather than this file's. V5b measured it on `/deal/[handle]`: `notFound()`
 * thrown from a dynamic route runs after the shell has been flushed, Next
 * cannot rewind a started response, and the not-found UI is handed to the
 * client. The status is 404 either way. Recorded again here so the next person
 * to notice finds the reason rather than the symptom.
 */

import { DocumentFrame } from "../../../components/document/DocumentFrame";

export default function DealNotFound() {
  return (
    <main>
      <DocumentFrame title="No certificate at this address" form="Form LD-404" revision="Rev. 2026-09">
        <p>
          Nothing is filed at this address. Either no certificate was ever issued here — check the link you
          were sent — or the one that was has since been withdrawn.
        </p>
      </DocumentFrame>
    </main>
  );
}
