# Brand, voice and visual direction

The approved direction for every customer-facing surface. It exists because
[`fresh-build.md`](../working/fresh-build.md) §13 forbids letting implementation
agents invent the brand as they code, and §14 forbids building a major surface
before a visual direction is approved. Gate B reviews this document as copy;
Gate C approves the visual half. Both are recorded in
[`status.md`](../working/status.md) when the operator accepts it.

Where this document and a slice plan disagree about what a surface says, this
document wins. Where it and [`fresh-build.md`](../working/fresh-build.md)
disagree about scope, the contract wins.

## 1. The brand in one paragraph

Lousy Deal sells a deliberately terrible transaction: a customer knowingly pays
$5, $10 or $25 for a numbered certificate proving they made a lousy deal. The
identity is **a deadpan financial institution**. Every surface is an official
transaction document — a purchase order, a quotation, a ledger, a receipt, a
certificate. The design never jokes. The *content* carries the humour, and it
carries it by being accurate: the price is real, the value is genuinely nothing,
and the site says so in the register a bank uses to say your balance is
insufficient.

The test for any new surface: **would a meticulous accountant who has not
understood the joke have laid it out this way?** If yes, it belongs.

## 2. Voice

**Register.** Institutional. Third person or passive where a form would use it.
Full stops. No exclamation marks anywhere, in any surface, ever.

**The humour is in the substance, never the delivery.** `VALUE ……… $0.00` is
funny because it is true and because it is set in the same type as the price
beside it. `VALUE ……… $0.00 (LOL!)` is not funny and is not this brand.

**Accuracy is the joke's load-bearing wall.** §23 of the contract is a rule, not
a caution: the joke must never depend on misleading a customer. A customer sees
exactly what they buy, the final price is explicit before payment, and every
disclosure is straight. A funny sentence that makes a disclosure less true is
cut, not softened.

**Never**: emoji, exclamation marks, memes, "just", "literally", "we get it",
second-person cajoling, urgency ("only 3 left"), fake scarcity, fake social
proof, invented testimonials, invented totals, comic mispellings, ALL-CAPS
shouting outside the label style, self-congratulation about the joke.

**Always**: sentence case in body and legal prose; all-caps only in labels,
document titles and buttons; tabular numerals for every figure; the same word
for the same thing on every page ("certificate", never "cert" or "token").

Worked examples of the register:

| Instead of | Write |
| --- | --- |
| Buy now — you'll regret it! 😄 | `ACQUIRE FOR $5.00` |
| Oops, page not found | `DOCUMENT NOT FOUND` |
| Thanks for your purchase! | `RECEIPT` |
| Our lawyers made us say this | This document is legally binding, unlike our value proposition. |

**Baldrick is out of scope here.** He arrives in LD-05 and needs his own voice
section, written then. Nothing in this slice speaks as him.

## 3. Visual direction

One direction, not three. The identity is narrow enough that alternatives would
be decoration: it is a document, set in one monospace face, ruled rather than
boxed, in ink on paper with a single red stamp.

### Typography

**IBM Plex Mono, and nothing else.** One typeface across the whole site, in
three cuts: 400, 400 italic and 700. It is Open Font License 1.1 and is
committed to the repository rather than fetched at build time, so a build is
hermetic and the same files serve both the web pages and the generated social
images.

Three cuts, not four. A 500 earns nothing in an identity whose emphasis comes
from capitals and letter-spacing, and every weight is a file in the image.

| Step | Size | Used for |
| --- | --- | --- |
| fine | 0.6875rem | fine print, legal footnotes, document numbers |
| small | 0.8125rem | labels, table headers, footer links |
| body | 0.9375rem | body copy, ledger rows, legal prose |
| section | 1.125rem | section headings |
| title | 1.5rem | page and document titles |
| display | 2.25rem | one figure per page at most — a serial, a price, `-100%` |

Labels and headings are all-caps with `letter-spacing: 0.08em`. Body and legal
text are sentence case. Line height is 1.6 for body, 1.2 for headings. Every
numeral is `font-variant-numeric: tabular-nums`, so a column of figures aligns
without a table cell forcing it to.

**Sub-headings take the body step**, not a smaller one — a legal document's
`§1.1` sits above prose it must not be smaller than, and caps with tracking
separate it well enough without a size change.

**A ledger row is set in two steps**: its label at the small step, its value at
the body step. The table above assigns "labels" and "ledger rows" to different
steps and both readings are defensible; this is the one taken. The label is the
quieter half of the pair, and the figure is the half a reader came for.

### Colour

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#FAFAF7` | background |
| `--paper-shade` | `#F1F0EB` | table header fill, row hover |
| `--ink` | `#141412` | text, rules |
| `--ink-soft` | `#6B6B66` | secondary text, fine print |
| `--stamp` | `#B3261E` | the only accent |

`--stamp` appears on: negative figures, the primary button, error states, the
stamp mark, and focus outlines. Nothing else. A second accent colour is a change
to this document, not a component's decision.

Measured against `--paper` by the WCAG 2.1 relative-luminance formula: `--ink`
17.6:1, `--stamp` 6.3:1, `--ink-soft` 5.1:1. All three clear AA for normal text,
so the fine print and the red are usable as text rather than only as
decoration. `--ink-soft` is still never the only carrier of something a reader
must act on. A test asserts these three ratios, so a token nudged later fails
the build rather than the audit.

Dark mode is deliberately **not** built: paper is the brand, and a document does
not have a night edition.

### Layout and shape

Content is 720px wide and centred. Certificates and legal documents are 640px —
narrower, because they are read rather than scanned. Border radius is 0
everywhere. No shadow, no gradient, no illustration, no photograph, no mascot,
no icon set. The only vector artwork on the site is the stamp mark.

The stamp mark is 120px square — `--stamp-size`, deliberately off the spacing
scale, because it is artwork rather than layout and nothing aligns to it.

Sections are separated by **rules, not boxes**: a 1px `--ink` horizontal rule.
A document's top and bottom carry a **double rule** — two 1px lines 3px apart.
Spacing comes from an eight-value scale and nothing between: 4, 8, 12, 16, 24,
32, 48, 64px.

The page itself sits in 32px of margin at the top, 16px at the sides and 64px
at the foot — a document has a wider foot than head, and the sides stay narrow
so a 390px screen loses as little measure as possible.

### Components

Six components carry the whole identity. They live in
`storefront/src/components/document/`.

- **`DocumentFrame`** — double rule top and bottom; a small-caps header row with
  the document title left and its form number and revision date right.
- **`LedgerRow`** — the signature component. Label left, dotted leader filling
  the middle, value right-aligned in tabular numerals. Rendered as a
  `<dl>`/`<dt>`/`<dd>` so a screen reader reads it as the pairing it is.
- **`Rule`** and **`DoubleRule`**.
- **`FinePrint`** — fine step, italic, `--ink-soft`.
- **`StampMark`** — inline SVG, a 1.5px double-ring circle with all-caps text in
  `--stamp`. **At most one per page**, and never on a page that already carries
  a display-size figure and a certificate border. Its accessible name is its
  text.
- **`Button`** — rectangular, 1px border. Primary is `--stamp` ground with paper
  text; secondary is transparent with an ink border. Hover inverts ground and
  text. Focus is a 2px `--stamp` outline with a 2px offset, visible on both.

Links are underlined and ink-coloured, visited identical to unvisited, hover
switches to `--stamp`. **Two things are not links in prose and are exempt.**
The masthead wordmark links home without an underline, because a letterhead
underlined would read as a footnote reference. And a `Button` rendered as an
`<a>` is styled as a button throughout — no underline, and its hover inverts
ground and text like every other button rather than turning `--stamp`, because
a control that looked like a control at rest and like a link on hover is worse
than either. Anything else that wants an exception amends this paragraph. Transitions never exceed 120ms and only ever animate
colour. Nothing scales, bounces, slides or fades. `prefers-reduced-motion` is
respected, which costs nothing because the only motion on the site is the
loading cursor.

The cursor is **drawn in CSS, not set as a glyph.** `▮` (U+25AE) is not in IBM
Plex Mono — measured against the source file the fonts are subset from — and a
character the typeface does not carry renders as tofu, which is the one thing
this identity cannot afford.

### Document numbers, and why they are form numbers

A document header needs a number on the right. It must not be a transaction
number: `AGENTS.md` forbids publishing a fabricated order, and a purchase-order
number on a page nobody ordered is exactly that.

So every static page carries a **form number and revision**, the way a real
institutional form does — `FORM LD-1 · REV. 2026-09`. It is honest, it is dull,
and it is the correct kind of dull. Only a page rendered from a real order ever
shows a real serial.

## 4. Copy, by surface

Only the surfaces this slice builds are specified. A surface that arrives with a
later slice gets its copy when that slice is planned, reviewed against this
document.

### Global

- Masthead: `LOUSYDEAL.COM`, centred, label style, linking home and not
  underlined. Beneath it, the line `PURVEYORS OF OBJECTIVELY BAD VALUE` at the
  fine step in `--ink-soft` — **upright caps, not the italic `FinePrint`
  carries elsewhere**, because italic all-caps at 0.6875rem is unreadable. It
  is written sentence case in the markup with `text-transform` doing the caps,
  so a screen reader and a copy-paste both get words rather than letters.
- Browser title and social description are the masthead and its fine print,
  unchanged: `LOUSYDEAL.COM` and `Purveyors of objectively bad value.` The tab
  is another surface, and it says what the letterhead says.
- Footer, on every page: three columns — **LEGAL** (Terms, Refunds &
  Withdrawal, Privacy, Imprint), **COMPANY** (Imprint contact address), and a
  fine-print trader line resolved from runtime configuration.

### Home — `FORM LD-1`, a purchase order

1. Masthead.
2. The offer, as a ledger block, not a hero:

   ```text
   ITEM ......................... LOUSY DEAL
   PRICE ........................ $5.00
   VALUE ........................ $0.00
   RETURN ....................... -100%
   ```

   `-100%` in `--stamp`. Then the primary button, `ACQUIRE FOR $5.00`.
3. **The tier table**, as one invoice-style table with columns ITEM /
   DESCRIPTION / VALUE / PRICE / ORDER — rows, not cards. Below 640px each row
   collapses into a stacked ledger block. The ORDER column's heading is for a
   screen reader only; sighted readers get the button. Its button reads
   `ACQUIRE`, without a price: the row already carries one, and a control
   repeating it puts the figure in the markup twice. The tier's name is added
   to the button's accessible name, so three buttons are not three identical
   entries in a controls list. Descriptions:

   | Tier | Description |
   | --- | --- |
   | Lousy Deal | Official numbered certificate of poor judgment. |
   | Lousy Deal Plus | Identical, but labelled Plus. |
   | Lousy Deal Pro | Professional-grade poor judgment. |

   Every row's VALUE column reads `$0.00`.
4. **`TERMS OF THIS OFFER`** — a fine-print block summarising, in four lines,
   what is actually bought: a numbered digital certificate and nothing else;
   supplied immediately; the price shown is the price charged and includes VAT
   where it applies; and that **at checkout the buyer is asked to consent** to
   immediate supply and to acknowledge that they thereby lose the 14-day right
   of withdrawal, with the box unticked. Each line links to the document that
   governs it.

   **That fourth line used to say the right "is waived at checkout by an
   express consent the buyer gives", and that was wrong.** VÕS § 53(4) p 7¹
   removes the right only once the trader has *also* given the § 55(1)–(2)
   confirmation on a durable medium — LD-02's order-confirmation email. Until
   that exists, the right is not waived, and a page saying it is overstates
   what the buyer gave up. The line now says what the checkout asks; it does
   not report an outcome.

The document is titled `PURCHASE ORDER`, and when the store offers nothing it
carries `No items of record. Nothing is currently offered.` in place of the
offer, the table and the terms — an empty invoice band above terms for a
product nobody can buy is a rendering artefact, not a document.

**No counter.** The prompt asked for `TOTAL VOLUNTARILY WASTED`. There is no
order data to compute it from, and `AGENTS.md` is explicit that a public counter
reports real orders or does not ship. It arrives with LD-02, wired to real
orders, or it does not arrive.

### Tier page — `/deal/[handle]`, `FORM LD-2`, a quotation

Document title `QUOTATION`. A ledger block for that tier — item, price, value,
return — then `UPGRADES AVAILABLE`, listing the more expensive tiers under the
line **"Pay more. Receive the same."** Then the primary button, then fine print
carrying the withdrawal notice and a link to Refunds & Withdrawal.

**No gift toggle.** Gifting is LD-03 and has no backend. A toggle that does
nothing is a lie in a control, which is worse than an absent feature.

### Cart — `ORDER SUMMARY`

Line items as ledger rows, the cart's own total as the closing row, and one
button to checkout. The empty state is a document too: `NO ITEMS OF RECORD`.

### Checkout — `PAYMENT AUTHORISATION`

The total, explicit, as a ledger row before anything else. Then fine print:
`Price includes VAT where applicable. The amount shown is the amount charged.`

Then the **consent checkbox**, unticked by default, which the pay control is
disabled behind:

> I request that supply of the digital certificate begin immediately, and I
> acknowledge that I will lose my right of withdrawal once supply has begun.

Then the Stripe payment element. The checkbox is required by
[`fresh-build.md`](../working/fresh-build.md) §23 and by VÕS § 53(4); its
wording is legal text and changes only with the legal documents.

### Certificate — the most designed surface

`CERTIFICATE OF LOUSY JUDGMENT`, 640px, centred, double-ruled. It carries: the
inscription the buyer chose or, where they chose none, "the bearer"; the amount;
the tier; the serial at display size; the issue date; one `StampMark` reading
`CERTIFIED LOUSY DEAL`; and the closing fine print:

> This certificate confers no rights, value, or benefits of any kind, and the
> bearer knew that.

It must be screenshot-worthy at 390px, because that is where it will be shared.

**In this slice it is built and reviewable but not public.** It renders from a
typed model at `/design/certificate` from a specimen record, serial `#0000`,
carrying the extra fine print `Specimen. No deal bears this number.` The public
route is `lousydeal.com/done-deals/{slug}` per contract §5 — an opaque,
non-enumerable slug, never the serial — and LD-02 mounts this same component
there against real data. The prompt's `/deal/nr/[publicId]` is not the agreed
URL and is not used.

### System pages

| Page | Title | Body |
| --- | --- | --- |
| 404 | `DOCUMENT NOT FOUND` | This page has even less content than our products. |
| Error | `PROCESSING ERROR` | The request could not be completed. This was not, on this occasion, deliberate. |
| Loading | — | A single blinking block cursor. No spinner. |

### Social images

1200×630, generated from the same tokens: paper ground, ink type, one stamp-red
figure, IBM Plex Mono. The home image renders the offer ledger. Certificate
images arrive with LD-02, when there is a certificate to render.

## 5. Legal documents

Four documents — Terms of Service, Refunds & Withdrawal, Privacy Policy,
Imprint — at 640px in `DocumentFrame`, with numbered sections (§1, §1.1) and a
short table of contents.

**The typography is the identity; the substance is straight.** An absurdist
flourish is allowed in a recital and nowhere that changes legal meaning. A
withdrawal clause, a data-subject right and a liability limit are never funny.

Every document closes with:

> This document is legally binding, unlike our value proposition.

followed by its last-updated date.

**Trader details are never literals.** Decision
[`004`](../decisions/004-trader-identity-is-runtime-configuration.md) governs:
content files carry `{merchantLegalName}`-shaped placeholders resolved
server-side per request, an unconfigured field renders as a **named visible
gap** with a notice that the document is incomplete — never a placeholder
string, never a fabricated value — and a `no-unresolved-placeholder` test is
required.

**The EU ODR platform is not linked.** It was closed on 20 July 2025 by
Regulation (EU) 2024/3228 and traders were obliged to remove the link. Estonian
consumer dispute information names the Consumer Protection and Technical
Regulatory Authority and its consumer disputes committee instead.

**These documents do not close the legal gate.** §23 makes that an operator
gate that a qualified human reader closes, recorded in `docs/decisions/`. This
slice writes them at the operator's instruction; publication still waits on that
acceptance.

## 6. What this identity forbids

A single list, so a later surface does not have to re-derive it:

- no raster image anywhere except generated social images;
- no second typeface, no second accent colour, no dark mode;
- no border radius, no shadow, no gradient, no card;
- no icon, illustration, mascot or photograph;
- no animation beyond a 120ms colour change and the loading cursor;
- no emoji and no exclamation mark, in any surface or any error message;
- no fabricated order, total, customer, testimonial or review;
- no client-side JavaScript for anything except the consent checkbox and the
  Stripe payment element.
