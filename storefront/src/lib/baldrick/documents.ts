/**
 * The documents Baldrick names, and where each one is. LD-11 J12.
 *
 * G5's finding 2: he told a visitor which document answered them -- "Refunds
 * and withdrawal is in the footer", "The address is in the Imprint" -- and
 * the conversation held no link, so they scrolled past the page and picked
 * the right one of five. He still names the document in the words he always
 * did; the name is now the way there.
 *
 * **Matched on his own words, not the visitor's.** `Surface.tsx` applies this
 * to his lines only. A visitor who types "imprint" has asked a question, not
 * been given a destination.
 *
 * **Every href is a `LEGAL_ROUTES` row, looked up rather than typed.**
 * `legal-routes.test.ts` checks those against the files under `src/app`, so a
 * renamed route fails there rather than leaving him pointing at a 404.
 */

import { LEGAL_ROUTES } from "../../content/legal-routes";

interface NamedDocument {
  readonly title: string;
  readonly href: string;
}

function route(href: string): string {
  const found = LEGAL_ROUTES.find((candidate) => candidate.href === href);
  if (found === undefined) throw new Error(`${href} is missing from LEGAL_ROUTES`);
  return found.href;
}

const BALDRICK_DOCUMENTS: readonly NamedDocument[] = [
  { title: "Refunds and withdrawal", href: route("/legal/refunds") },
  { title: "Terms of service", href: route("/legal/terms") },
  { title: "Imprint", href: route("/legal/imprint") },
];

interface LineSegment {
  readonly text: string;
  readonly href?: string;
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole words only: "Imprinted" is not the Imprint. Every title starts and
// ends with a word character, so `\b` bounds each one.
const TITLES = new RegExp(`\\b(${BALDRICK_DOCUMENTS.map((document) => escape(document.title)).join("|")})\\b`);

export function lineSegments(line: string): LineSegment[] {
  return line
    .split(TITLES)
    .filter((text) => text.length > 0)
    .map((text) => {
      const document = BALDRICK_DOCUMENTS.find((candidate) => candidate.title === text);
      return document === undefined ? { text } : { text, href: document.href };
    });
}
