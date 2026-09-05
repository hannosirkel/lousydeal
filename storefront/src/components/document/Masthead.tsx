/**
 * The letterhead every page carries, per `docs/current/brand.md` §4. Its two
 * strings come from `src/content/chrome.ts`, and a test holds them to what
 * that document says.
 *
 * A `<header>` rather than a heading: the wordmark is the site's identity on
 * every page, not that page's title, and an `<h1>` here would give every
 * document the same first heading and push its real one to level two.
 *
 * The wordmark is a link and is not underlined. That is the one exception to
 * `brand.md` §3's link rule, and it is written into §4 there rather than taken
 * here — a letterhead is not a link in prose, and underlining it would make
 * the one element on every page look like a footnote reference.
 */

import { MASTHEAD_LINE, MASTHEAD_MARK } from "../../content/chrome";

export function Masthead() {
  return (
    <header className="masthead">
      <a className="masthead-mark" href="/">
        {MASTHEAD_MARK}
      </a>
      <p className="masthead-line">{MASTHEAD_LINE}</p>
    </header>
  );
}
