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

### Baldrick's voice

LD-09 deferred this: "he arrives in LD-05 and needs his own voice section,
written then." Written now, in B1, because nothing else in that slice is
authorised until the identity admits him.

**He is lazy.** That is the whole character and it is a decision, taken by the
operator on 2026-09-08. Not eager, not cheerful, not a helper. A sales
assistant who cannot be bothered, employed by a shop that sells nothing — the
two facts explain each other, and neither needs a joke written on top of it.

**The name is a name.** It is not a reference to any existing character and
carries none of one. Nothing in his voice, his phrasing or his history borrows
from anywhere; there is no catchphrase, no running gag inherited from
somewhere else, and no wink at a reader who thinks they recognise him. Recorded
here as a decision so that a later writer does not add the reference this
section is declining.

**Laziness is why he is safe.** §11 forbids invented customers, totals,
testimonials and social proof, and `AGENTS.md` forbids fabrication outright.
An eager assistant strains against that wall constantly — enthusiasm invents.
A lazy one never approaches it: making something up is work, and he would
rather point at a document than summarise one. His failure mode is telling you
less than you wanted, which is the harmless direction.

**He is wrong about his own effort, never about a fact.** He may be reluctant,
unhelpful, dismissive of a question he could easily answer, and openly
uninterested in whether you buy anything. He may not misstate what the product
is, what it costs, or what the law gives you. The site's accuracy wall stands
behind him unchanged: a funny line that makes a disclosure less true is cut.

**How laziness reads with no exclamation marks.** It is the easiest register on
this site to write, because the rules are already restraint. Short sentences.
Flat statements. He answers the question asked and stops before the sentence
that would have helped. He does not apologise, does not offer alternatives, and
does not ask if there is anything else.

**What he never does**, beyond §2's list, which binds him as it binds every
surface:

- state a price, a total or any figure — the worth is said in words, never in
  numbers, and `$0.00` is the site's line and not his;
- state an entitlement, a period or a provision. He may name *Refunds and
  Withdrawal* or the *Imprint* and stop there; summarising a legal document is
  both effort and risk, and he is against both;
- claim to remember, look up, send, forward or pass anything on;
- invent a count, a percentage, a statistic or another customer;
- use a term of art, a section number or the word "policy".

**He has no face.** No avatar, no illustration, no mascot — §6 keeps all of
them. He is a name and a column of text.

**Nobody is typing, so nothing says typing.** The indicator that runs between
his messages is a pause, and the honest description of a pause in a
deterministic bot is that a pre-written line is being selected. Its accessible
text says so. This is the same choice as `Nothing yet. You could be the first,
which is worse.` — the true version, which is also the funnier one.

Worked examples, in his register:

| Instead of | Write |
| --- | --- |
| Hi there! How can I help you today? 😊 | Yes. |
| Great question! Let me look that up for you. | I could look that up. |
| I'd be happy to explain our refund policy! | That is in Refunds and Withdrawal. It is in the footer. |
| Sorry, I didn't quite catch that — could you rephrase? | I did not understand that. I am not going to guess. |
| You get a beautiful numbered certificate — and so much more! | A certificate. That is the whole list. |
| We have an amazing discount just for you! | There is a discount code. It is BALDRICK20. Type it on the order summary. It makes your deal worse. |

`I've applied BALDRICK20. Your price is now 20% higher` is tempting copy he
does not say: he cannot see or apply a cart code, and the cart owns the figure.

Nothing outside `content/baldrick.ts` speaks as him, and he speaks nowhere the
site speaks for itself.

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
everywhere. No shadow, no gradient, no illustration, no mascot,
no icon set. The only vector artwork on the site is the stamp mark.

**"No photograph" is amended by LD-04, 2026-09-10** — see §6, which carries
the argument and the exact width of the admission. In short: a photograph of a
good actually on sale, on that good's own page and beside its row in the
upsell. Framed by a one-pixel rule and captioned in label style, so it reads as
an exhibit in a filing rather than a hero shot.

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
  `--stamp`. **At most one per page.** Its accessible name is its text.

  This paragraph used to add "and never on a page that already carries a
  display-size figure and a certificate border", which §4 then requires of the
  certificate — all three, on the one surface. The certificate is where the
  identity spends everything it has; the rule was written for the pages that
  are not it, and as a prohibition it contradicted the document it appeared in.
  One stamp per page is the rule. Whether a page has earned one is a review
  question.
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
   confirmation on a durable medium. The line says what the checkout asks; it
   does not report an outcome.

   **LD-02 built that confirmation and it is sent** — C9 wrote it, C10 and C11
   gave both deployments a transport, and C15's Gate E order received one. That
   does not change this line. Sending the confirmation makes the third
   condition *capable* of being met; whether it was met for a given order turns
   on timing the site cannot settle, since supply here begins the instant
   payment succeeds and the confirmation follows it. C13 rewrote the four legal
   documents to say the confirmation is sent and to decline to conclude that
   the right is therefore gone, and a cross-surface test forbids any surface
   claiming otherwise.

The document is titled `PURCHASE ORDER`, and when the store offers nothing it
carries `No items of record. Nothing is currently offered.` in place of the
offer, the table and the terms — an empty invoice band above terms for a
product nobody can buy is a rendering artefact, not a document.

**The counter, headed `RECORD TO DATE`.** A ledger block between the offer and
the terms — `DEALS DONE`, `AMOUNT WASTED` in stamp red, `LATEST DEAL` as a
serial. It arrived with LD-02 wired to real orders, which is the condition the
paragraph that stood here set.

**Not `TOTAL VOLUNTARILY WASTED`,** which the prompt asked for. §2 rules out
the register: a shop telling its customers how much they have squandered is the
second-person cajoling that section forbids. A ledger heading states and does
not editorialise, and the figures are funnier without help.

**Zero shows.** Most of this shop's life will be spent there, and the row reads
`Nothing yet. You could be the first, which is worse.` A counter that appears
only once it is impressive is one lying about its floor.

**It disappears rather than guessing.** Where the figures cannot be read at
all, the whole block is omitted — `0` and "could not ask" are different claims,
and only one is a fact about the shop. `AGENTS.md` forbids publishing a
transaction total; a zero nobody measured is one.

### Tier page — `/deal/[handle]`, `FORM LD-2`, a quotation

Document title `QUOTATION`. A ledger block for that tier — item, price, value,
return — then the primary button, reading `ACQUIRE FOR $5.00` with that tier's
own price, as the home page's does. Then `UPGRADES AVAILABLE`, listing the more
expensive tiers under the line **"Pay more. Receive the same."** Then fine
print carrying the withdrawal notice and a link to Refunds & Withdrawal.

Each upgrade is a ledger row: the tier's name, the leader, its price. Only
tiers costing **strictly more** are listed — a tier priced the same is not an
upgrade, and offering one would be inviting a buyer to pay the same amount for
the same nothing, which is a joke this site does not make.

On the most expensive tier **the heading goes with the list**, replaced by
**"This is the worst deal available. There is nothing further to pay for."** A
document announcing `UPGRADES AVAILABLE` directly above a line saying there are
none is inaccurate, and accuracy is what carries the joke.

**An upgrade's name is set in label style**, capitals and tracking, because it
is the label half of a ledger row. The same name appears sentence case in the
home page's table, where it is the row's subject rather than a label. Two
roles, not two spellings — §2's rule is about the words, and they are the
same.

The withdrawal notice says what the checkout *asks*, never that a right is
already lost: "This is digital content supplied immediately. At checkout you
are asked to consent to supply beginning at once, and to acknowledge that you
thereby lose the 14-day right of withdrawal. The box is not ticked for you."
The reason is §5's, and it is the same reason the home page's fourth line is
worded that way.

A handle no tier has is a **404**, not an empty quotation — a document headed
`QUOTATION` with no item tells a reader, and a crawler, that a deal exists.

The tier name in the home page's table links here.

**No gift toggle here.** This said "gifting is LD-03 and has no backend. A
toggle that does nothing is a lie in a control, which is worse than an absent
feature." LD-03 built the backend, so the objection is spent — but the control
did not land on this page. It is at the checkout, where the buyer is already
being asked things, rather than on a page whose one job is to describe a tier.

### Cart — `ORDER SUMMARY`

`FORM LD-3`. Line items appear as ledger rows, with the cart's own total as the
closing row — read from the API, never summed here. Its primary route onward is
`PROCEED TO PAYMENT`, immediately below the cart controls. The empty state is a
document too: `NO ITEMS OF RECORD`.

**The adjustment row.** A discount code adds a line to the cart, and that line
is an adjustment, not merchandise. It is one ledger row, directly above
`TOTAL`, on every ledger that offers payment — this one and the payment
authorisation:

```text
DISCOUNT (BALDRICK20) ............ +$1.00
TOTAL ............................ $6.00
```

The label is the line's own title, `Discount (BALDRICK20)`, written sentence
case in the markup as every label is and set in the label style. It is the
title the backend wrote when it priced the code, never a word read back out of
the line's metadata, which any visitor can rewrite through Medusa's public
line-item route. The joke is in the parenthesis and nowhere else: the row is
called a discount because the buyer typed a discount code, and it says what it
did to the price in the same type as the price.

**Its value carries a `+`.** Every other figure in a ledger is a figure; this
is the one value on the site that adds to the row beneath it, and a reader
scanning a column of amounts must not have to work out which way it went. The
plus is set in `--ink`, not `--stamp`: §3 spends the accent on negative figures,
and this one is not negative. The figure is the line's own price, formatted and
never computed here, and it is the line's whole figure because the payability
rule admits one such line, of quantity one, and nothing else.

**The code control.** Directly under the ledger and above `PROCEED TO PAYMENT`,
one field labelled `DISCOUNT CODE` sits beside a button labelled `APPLY CODE`.
It is an ordinary form and works without scripting. Below 480px the label,
field and button stack rather than compete for one line. The browser limits the
field to 64 characters; the server still validates it, because a browser limit
is not a trust boundary.

A refused submission returns to this same document and prints exactly one
clerk's notice above the field. The reason is selected from the three values the
backend owns, never reflected from the URL:

| Reason | Notice |
| --- | --- |
| Unknown code | That code is not on file. Nothing in the cart changed. |
| No certificate | A discount code needs exactly one certificate in the cart. Choose the one you want, then try again. |
| Completed cart | This order is already complete. Start a new purchase to use a code. |

The adjustment's `REMOVE` is the same quiet, underlined word a merchandise row
uses. Removing it posts the line id through the cart's existing action and
returns to the freshly read summary.

### Checkout — `PAYMENT AUTHORISATION`

`FORM LD-4`. The total, explicit, as a ledger row first — beneath the
adjustment row where there is one. Then fine print: `Price includes VAT where
applicable. The amount shown is the amount charged.`

Where the cart carries a discount line, the adjustment row specified under
`ORDER SUMMARY` appears here too, directly above `TOTAL`, with its `+`. A buyer
can reach this page by URL or by the back button, and the page that takes the
money is the one §23 is about: a total above the tier's price with nothing on
the page saying why is a silent adjustment, however visible the line was one
page earlier.

A cart carrying the discount line twice, or once at a quantity other than one,
is refused here, as a cart with two certificates is, and the refusal has its
own notice. The two older notices tell a buyer to choose or add a certificate,
which is the wrong fix:

> A discount code applies to an order once. This cart carries its discount line
> more than once, or at a quantity above one, so the total shown is not the one
> the code produces. Return to the order summary, remove the discount and enter
> the code again; nothing else in the cart needs to change.

On a refused page — this one, or either of the certificate's — the ledger
shows the total alone. Nothing has proved the line's quantity is one, so its
price is not its figure, and a row reading `+$1.00` beside a total that rose by
two would be the thing the refusal exists to prevent.

Then the **consent checkbox**, unticked by default, which the pay control is
disabled behind:

> I request that supply of the digital certificate begin immediately, and I
> acknowledge that I will lose my right of withdrawal once supply has begun.

Then the Stripe payment element. The checkbox is required by
[`fresh-build.md`](../working/fresh-build.md) §23 and by VÕS § 53(4); its
wording is legal text and changes only with the legal documents.

While the box is unticked the pay control is **disabled** and fine print under
it reads `Payment cannot begin until that box is ticked.` — a control that is
off says why, rather than leaving the reader to work it out.

**A disabled control is drawn in `--ink-soft`, not in `--stamp`.** The accent
is this identity's error state, and a not-yet is not an error.

**A ticked checkbox is `--stamp`**, set with `accent-color`. Left alone the
browser draws its own platform blue, which would put a second accent on the
one control this site's legal position rests on. The colour-literal test
guards source and cannot see a colour a browser draws, so it is said here.

**The consent sentence is set at the body step**, not the small step. It is
legal prose that happens to live inside a `<label>`, and §3's table gives the
small step to labels rather than to disclosures.

The country control is bordered in `--ink` on the paper, like every other
field. **Its disclosure triangle stays the browser's** — drawing one would be
the icon set §6 forbids.

An empty document offers a way on: `NO ITEMS OF RECORD` above a secondary
`RETURN TO THE PURCHASE ORDER`. A dead end is not a document.

While the payment session is being created the page shows the blinking cursor
with the hidden word `Preparing payment`. That is the state §4's loading row
means: one inside a rendered page, never a route boundary.

### Gift block — a disclosure inside `PAYMENT AUTHORISATION`

`<details>`, closed, summarised `Send this to somebody else`. Inside it: the
recipient's email address, their name, a name for the buyer, and a short
message — the address required and the other three not, because §6 makes only
the address load-bearing.

**Closed is the decision, not the default.** Most orders are not gifts, and
four fields a buyer has to read past to reach the pay button would tax every
ordinary purchase for the sake of the occasional one. `<details>` also opens
without scripting and is a control screen readers already announce, which a div
with a click handler is not.

The notice above the fields does one thing the rest of the checkout does not:
it distinguishes these four from the two directly above them. §5's pair is
public and printed; these are private and emailed. A buyer who put the
recipient's name into `NAME ON THE CERTIFICATE` expecting privacy has been
misled by the page, and that is the failure this copy exists to prevent.

The preview beneath the message is the inscription preview's twin, headed
`WHAT THEY WILL READ`. Its empty state is `No message` — **not** the
certificate's `The bearer`, which names who a certificate is made out to and
under this heading would claim the recipient reads those words.

### Mail — three documents, and none of them is a page

Nothing here had a specification until three transactional messages existed.
They are documents in the same sense the pages are, and they are read in clients
this identity does not control.

**Plain text is the authoritative half.** Each message is built as sections —
an upper-cased heading, a blank line, then lines — and the HTML says the same
things in the same order. A reader who sees only one of them has the whole
document. No images, no web fonts, no tracking pixel, no layout that a narrow
client can break: an email that needs the network to be legible is not a durable
medium.

**Headings are upper-cased and names are not.** A person's name in a heading
would be shouted, and `McDonald` would print as `MCDONALD`. So the greeting is
impersonal and the name is the first line of the body.

The three:

- **`Your lousy deal #N`** — the § 55(1)–(2) confirmation, to the buyer. The
  longest of the three by a distance, because § 55(2) requires the § 54(1)
  information reproduced rather than linked. It gains one line when the order
  was a gift and loses none.
- **`We received your withdrawal`** — the § 56⁴(4) receipt, to whoever used the
  withdrawal function, and separately to the trader, who is the only record
  LD-02 keeps of it.
- **`<name> bought you a lousy deal`** — the gift, to somebody who did not ask
  to hear from us. It opens `Someone spent $5.00 on absolutely nothing for
  you.`, carries no right the reader does not hold, offers nothing to buy, and
  ends with who sent it and why we have their address.

### Certificate — the most designed surface

`CERTIFICATE OF LOUSY JUDGMENT`, 640px, centred, double-ruled. It carries: the
name the buyer chose or, where they chose none, "the bearer"; their dedication,
when they left one; the amount; the tier; the serial at display size; the issue
date; one `StampMark` reading `CERTIFIED LOUSY DEAL`; and the closing fine
print:

> This certificate confers no rights, value, or benefits of any kind, and the
> bearer knew that.

It carries **no form number**. Every other static page does — §3 says so — but
a certificate is not a form, and a form number on it would claim the wrong kind
of document. Its serial is its number.

Its facts are set as a ledger, left-aligned inside the centred document — a
column of figures that wanders with its labels is not a ledger. The labels are
`BEARER`, `ITEM`, `AMOUNT WASTED`, `ISSUED`, and where no name was left the
bearer line reads **`The bearer`** rather than collapsing: §5 requires an empty
inscription to look deliberate, and most buyers will leave one.

**The dedication is not a ledger row.** Contract §5 gives the buyer two fields,
not one — a short name and a line of up to 120 characters — and they are
different kinds of thing: the name is a fact about the document and belongs in
the ledger, the dedication is somebody's voice. It is set as a quotation
between the ledger and the stamp, centred with the document rather than ranged
left with the figures, and italic — the only italic the certificate uses, which
is what marks it as quoted rather than stated.

**It is the one element that disappears when empty.** Every ledger row holds
its place, because a missing row is a document with something wrong with it.
An empty quotation is not a deliberate blank; it is a pair of quotation marks
around nothing. The marks themselves are drawn by the stylesheet rather than
typed into the text, so a buyer who uses a quote character does not end up
nested inside the document's own.

The date is the stored ISO date, rendered as it is stored. A shared screenshot
outlives the runtime that made it, and a locale format would read differently
for the person it was sent to.

It must be screenshot-worthy at 390px, because that is where it will be shared.

**In this slice it is built and reviewable but not public.** It renders from a
typed model at `/design/certificate` from a specimen record, serial `#0`,
carrying the extra fine print `Specimen. No deal bears this number.` The public
route is `lousydeal.com/done-deals/{slug}` per contract §5 — an opaque,
non-enumerable slug, never the serial — and LD-02 mounted this same component
there against real data: C15's Gate E order rendered
`/done-deals/6hvn0jbfw32g1dr8` from a paid order, as a page and as a one-page
A4 PDF. The prompt's `/deal/nr/[publicId]` is not the agreed
URL and is not used. The specimen route carries `noindex, nofollow`: a design
surface is not a page a search engine should hold, and Access will not always
be the thing keeping it out.

### System pages

| Page | Title | Body |
| --- | --- | --- |
| 404 | `DOCUMENT NOT FOUND` | This page has even less content than our products. |
| Error | `PROCESSING ERROR` | The request could not be completed. This was not, on this occasion, deliberate. |
| Loading | — | A single blinking block cursor, drawn in CSS. No spinner. Carries the hidden word `Loading` for a reader who cannot see it. **Used inside a page, never as a route boundary** — see below. |
| Layout error | `PROCESSING ERROR` | The same, without masthead or footer — the layout that renders them is what failed. |

**The loading cursor is not a `loading.tsx`.** A Suspense fallback at a route
root makes Next flush the shell as soon as the fallback renders; after that
the status is committed and the body arrives only through inline scripts. One
shipped briefly, and it was measured serving every page as masthead, cursor
and footer with no content at all without JavaScript, and answering an unknown
deal handle with 200 instead of 404. Every route here is a document that has
to arrive whole, so no segment can afford to stream. The cursor belongs to a
state *within* a rendered page — the checkout waiting on its payment session
is the one that has it.

The error page offers **"Return to the purchase order"** as a secondary button
rather than a retry control: a retry needs a click handler, and a link works
even where the boundary's own JavaScript did not load. It never shows what was
thrown.

Form numbers: `FORM LD-404` and `FORM LD-5XX`. A form number for a page that
is not a form is the joke a filing clerk would have made, which is the register
§1 asks for.

### The share row

Under the certificate, outside its closing rule, headed `SHOW SOMEBODY`. Three
links — X, Bluesky, an email — set as a centred row of links and not as
buttons: this identity has no button that is not a control, and sharing is a
link somebody follows.

**They are anchors, and that is the whole design.** A share widget is a script
from somebody else's server, on a page whose answer to "what do you load from
elsewhere" is *nothing*. These load nothing, contact nobody until they are
pressed, and carry `rel="noreferrer"` so that pressing one does not hand the
destination the certificate's address before its owner has said anything. A
line of fine print under the row says so, because a reader of this site's
privacy notice would reasonably wonder.

The words shared are the buyer's, in the first person and the past tense — *"I
bought a certificate that confers nothing. It has a number."* A brand asking to
be reposted is the register §2 rules out; somebody reporting what they did is
not.

### Social images

1200×630, generated from the same tokens: paper ground, ink type, one stamp-red
figure, IBM Plex Mono. The home image renders the offer ledger.

**The certificate's card leads with the serial**, at display size and in stamp
red — it is the one figure the card is for, and the reason a link is worth
opening. Under it, three ledger rows: bearer, item, amount. Not the date, which
is on the document and not the reason anybody clicks; and never a billing name,
which no surface on this site has.

Its alt text is the document's title and the serial, not the inscription. A
card's alt is read aloud on somebody else's timeline, and the inscription is
already in the picture.

## 5. Legal documents

**The social image's ledger leader is dashed, not dotted.** Satori, which
renders it, rejects `borderStyle: "dotted"` outright — "Allowed values: solid |
dashed" — so the choice was the nearest thing it renders or a hand-drawn row of
glyphs that sets to a different rhythm at every width. It is the one place on
any surface where the leader is not dotted, and at 1200px it reads as though it
were.

Four documents — Terms of Service, Refunds & Withdrawal, Privacy Policy,
Imprint — at 640px in `DocumentFrame`, with numbered sections (§1, §1.1) and a
short table of contents headed `CONTENTS`.

Form numbers: `FORM LD-T`, `FORM LD-R`, `FORM LD-P`, `FORM LD-I`.

**The section sign is hidden from a screen reader.** `§1.1` announced as
"section sign one point one" is punctuation read aloud; the heading text
carries the meaning and the sign is there for the eye.

Where a document is missing a detail it must state, it says so under its last
section, above the closing line: `This document is incomplete: a detail it is
required to state has not been configured.` The gaps themselves are named
where they fall.

The last-updated line is labelled `Last updated`, at the fine step under the
closing sentence.

**A sub-section is indented and takes the next heading level**, and its entry
in the contents list is indented to match. Depth comes from the number, so a
content file stays a flat list and renumbering a clause does not restructure
anything.

**A contents entry is set at the body step**, not the small step. §3's table
gives `small` to labels, table headers and footer links; a contents entry is
none of those, and at the small step the links measured 17px tall with 20.8px
between centres, which fails WCAG 2.2 SC 2.5.8 on both size and spacing.

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

A single list, so a later surface does not have to re-derive it. Two entries
carry amendments, both made by LD-05's B1 and both marked: this list is meant
to be argued with in the open rather than edited quietly. One of those two was
then **withdrawn by LD-05's B7**, also marked, for the reason that entry gives.

- no raster image anywhere except generated social images;

  **Amended by LD-04, 2026-09-10, on the operator's approval: and photographs
  of the printed goods.** A buyer paying real money for a shirt this site
  refuses to show them is misled *by omission*, and §2 makes accuracy the
  load-bearing wall. This entry was protecting the identity at the
  disclosure's expense, which is backwards for the one thing here that is
  worth something — the certificate is worthless on purpose; the shirt is not.

  The admission is exactly this and nothing wider: **Printful's mockup of a
  good actually on sale, of the same artwork the order is fulfilled from,
  downloaded once and committed to this repository**. Never hotlinked — the
  site loads nothing from anybody else's server, and Printful's own URLs
  expire. Never a stock photograph, never a lifestyle scene, never a person,
  never a good that is not for sale. It appears on that good's own page and
  beside its row in the upsell, and nowhere else.

  **Fetched once, when the product is added, and not again** — the operator's
  condition, and the right one: a page that regenerates its own illustrations
  is a page whose appearance nobody has approved.

- no second typeface, no second accent colour, no dark mode;
- no border radius, no shadow, no gradient, no card;
- no icon, illustration, mascot or photograph;

  **Amended with the entry above, LD-04, 2026-09-10: except the product
  photographs it admits.** Icons, illustrations and mascots stay out. The
  cart's remove control, added in the same slice, is the word `Remove` — a
  control that says what it does needs no picture, and a bin glyph would have
  needed a hidden label carrying that same word anyway.
- no animation beyond a 120ms colour change and the loading cursor.

  **B1 amended this to admit a third, for Baldrick's pause indicator. B7
  withdrew that amendment, because the indicator turned out to be the loading
  cursor.** B5b reached for a second animation, found the blinking block
  already in `globals.css` with its own `prefers-reduced-motion` exception
  already argued, and used it. Nothing was added, so nothing needed admitting —
  and this list is shorter for it, which is the direction it is supposed to
  move in.

  B1's amendment was also wrong on its own terms: it called the indicator "the
  second animation this identity has ever admitted" while the sentence above it
  named two already. A list that counts itself incorrectly is a list nobody is
  reading, which is the argument for withdrawing rather than renumbering.

  The reasoning B1 gave still holds and is why the beat exists at all: a
  deterministic bot that answered instantly would read as a lookup table rather
  than as a character — which it is, but the joke needs the beat. The blink is
  a CSS animation so that `globals.css`'s `prefers-reduced-motion` rule
  flattens it; the *pauses between his messages* are JavaScript timers and that
  rule cannot reach them, so LD-05's presenter reads the preference itself and
  collapses them. Neither half is optional;
- no emoji and no exclamation mark, in any surface or any error message;
- no fabricated order, total, customer, testimonial or review;
- no client-side JavaScript for anything except the consent checkbox, the
  Stripe payment element, the two error boundaries, and **Baldrick** (amended
  by LD-05's B1) — a React error boundary cannot be a Server Component, so
  `error.tsx` and `global-error.tsx` carry `"use client"` as a framework
  requirement rather than a choice. They render no interactivity beyond a link.

  **Baldrick is the first exception that is a choice.** The three before him
  are requirements: a checkbox the law makes conditional, a payment element
  Stripe owns, and a framework constraint. He is a character somebody wanted,
  and §8 of the contract asks for typing indicators, pauses and messages
  arriving one at a time, none of which a server can do. The operator took that
  decision on 2026-09-08 against the alternative — a server-rendered transcript
  that would have kept this list at three.

  Two things bound it. He is **not rendered at all** where scripting is off:
  not a disabled input, not a dead button, because this document says elsewhere
  that a control which does nothing is a lie, and a chat box that cannot send
  is exactly that. And he gates nothing — the only thing the contract has him
  unlock is Enterprise, which §10 defers out of V1 — so every purchase path on
  this site still works with scripting off, which is the property this list
  exists to protect.
