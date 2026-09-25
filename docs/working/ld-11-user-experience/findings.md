# LD-11 — Findings

What this slice measured, and what it settled.

The plan is [`../ld-11-user-experience.md`](../ld-11-user-experience.md). This
file holds the evidence its rows are built on, kept apart so that a row can be
read against the thing that proved it, and so that neither file has to be read
whole to use the other.

**No customer identity appears here.** Live order #1 is named by its figures and
its date, never by the recipient's name, address, email or certificate slug —
the plan's global constraint 2, which governs this file equally.

## What the first live order measured

Live order #1, placed 2026-09-19 10:08 UTC. A gift, with merch, with a
discount code. The buyer is the operator; the recipient is a third party whose
identity is deliberately absent from this public document.

| Line | Amount |
| --- | --- |
| Lousy Deal | $5.00 |
| Discount (`BALDRICK20`) surcharge | $1.00 |
| Lousy Deals Trucker Cap | $29.00 |
| Postage | $6.40 |
| **Order total** | **$41.40** |

The certificate records `$6.00` — the tier plus its surcharge, which is what
LD-06 decided a coded certificate is worth. Four things went wrong, and three
of them reached a third party: defects 1 and 2 as false sentences in the gift
message, and defect 3 as a certificate that renders `The bearer` and carries no
dedication. Only defect 4 never left the shop. **Four defects, three of which
reached a third party** — the count the plan's introduction is written to
match.

1. **The gift message quoted `$41.40`.** `order-placed.ts` formats the order
   total once and hands the same string to both messages, under a comment
   arguing that "a buyer and a recipient comparing them should see one number".
   That reasoning was sound when a gift order was a certificate and nothing
   else. With a parcel in the order it makes the recipient read
   `Someone spent $41.40 on absolutely nothing for you.` and then open a
   certificate that says `$6.00`. The two documents contradict each other and
   the email is the wrong one.
2. **The gift message said nothing else was coming.** `GIFT_WHAT` promises
   "there is nothing to claim, no account to create and nothing to install" and
   "there is nothing else coming". A trucker cap was in the post to the
   recipient's own address at the time that sentence was sent. It is the only
   line in this repository's mail that is simply false.
3. **The buyer put the recipient's name in the wrong field.** `display_name`
   and `dedication` were both empty; `gift_recipient_name` and
   `gift_sender_name` both held the recipient's name. The certificate rendered
   `The bearer` and carried no dedication. `brand.md`'s gift notice names the
   *mirror image* of this — a buyer who puts the recipient's name into
   `NAME ON THE CERTIFICATE` expecting privacy — and order #1 went the other
   way, leaving the public pair empty. The notice is written against one
   direction of a confusion that runs both ways, which is F4's actual subject:
   the two name groups are indistinguishable, not underexplained.
4. **Nothing in the product can edit an issued inscription.** §5 requires that
   an operator can sanitise, hide or blank an inscription without a reissue,
   and the render is derived precisely so they can. There is no route, no
   script and no admin surface that does it. The repair on 2026-09-19 was a
   hand-written `UPDATE` against the live database over `kubectl exec`.

**And one thing went right, unaided, which is the fifth observation and not a
fifth defect.** The gift block collects an email address and no postal address;
the shipping address is a separate field belonging to the merch upsell. The
buyer entered the *recipient's* postal address there, which was correct, and
nothing on the page told them to. They had to work out that the shipping
address is where the parcel goes and that it is not derived from the gift
block. It is recorded here because a buyer who guesses wrong sends a stranger's
hat to themselves, and because F5 rests on it: without this line F5 would be a
row with no finding behind it.

## G1 — Home, deal and goods: the browse flow

Walked on the live open store, 2026-09-22, at 390×844 and 1280×900, in
Chromium, as a first-time visitor with no cookie. Screenshots at 390px are in
[`g1/`](./g1/), alongside the 1280px cart that findings 3 and 4 compare
against — **kept, because a claim about desktop should keep its desktop
capture**, and the first version of this section discarded those renders while
still making desktop claims. Two carts were created and abandoned,
which is the accepted property `findings.md` already records for checkout.

The row asked whether a visitor can reach a merch-only cart without intending
to, and what the browse flow would have to do so they cannot. **They can, and
the browse flow is not what lets them — the absence of one is.**

1. **`/goods` is a 404, and nothing on the site links to a goods page until
   the cart already has something in it.** The four printed things are in
   `sitemap.xml`, so a search engine can land a visitor directly on one, and
   [`goods.png`](./g1/goods.png) is what the index itself serves: `DOCUMENT
   NOT FOUND`. Measured: `/` and all three `/deal/*` pages contain zero
   `href="/goods/…"`; a cart holding one item contains four. So the only
   navigation path to a product page runs *through* a cart, and the only other
   way in is search.

2. **A merch-only cart offers to pay, and the refusal arrives a page later.**
   `CART_NEEDS_CERTIFICATE_NOTICE` is rendered by `checkout/page.tsx`, not by
   the cart. A visitor who adds a sticker sees a total, `APPLY CODE` and
   `PROCEED TO PAYMENT` ([`cart-merch-only.png`](./g1/cart-merch-only.png));
   clicking it lands on `PAYMENT AUTHORISATION`, which tells them the printed
   things go with a certificate rather than instead of one
   ([`checkout-merch-only.png`](./g1/checkout-merch-only.png)). The row
   expected this notice "at the cart". It is not at the cart. A visitor is
   told what they may buy only after committing to pay for it.

3. **At 390px the cart breaks a money figure across two lines.** The line-item
   `$6.00` renders as `$6.0` / `0`. Measured with `Range.getClientRects()`,
   not by eye: two rects for that node at 390, one at 1280. A price split
   across lines is the one figure on the page that has to be read at a glance.

4. **At 390px the upsell's item column is too narrow for any multi-word
   name, and the one long word in it breaks mid-word.** Every name wraps:
   `Certified Worthless` and `Lousy Deals Trucker Cap` over four lines,
   `Original Purchase Receipt` and `This Mug Cost Extra` over three. Only
   `Certified Worthless` breaks *within* a word — `Certifie` / `d Worthles` /
   `s`. The other three wrap at their spaces, which is ordinary wrapping in a
   column that is too narrow rather than a separate defect.

   **An earlier version of this finding said all four broke mid-word**, which
   was stated as measured and was not: the measurement behind it counted lines
   per name, which four words on four lines satisfies without any word
   breaking. Re-measured per word with `Range` over each word's own offsets.
   The column width is the defect; the mid-word break is what it does to the
   one name long enough to show it. At 1280 nothing wraps at all.

5. **Every commerce route shares one `<title>`.** `/`, `/deal/*`, `/goods/*`
   and `/cart` all serve `LOUSYDEAL.COM`, while `/legal/*` serve real ones
   (`Terms of service`). A visitor comparing two tiers in two tabs has two
   identically-named tabs, and their history records the same line for every
   step of the purchase.

6. **The upsell asks about a deal the cart may not contain.** `MERCH_HEADING`
   is `Would you like to make your deal worse?`, and it renders above the four
   products on a cart holding no certificate at all.

7. **Nothing anywhere links to the cart.** Measured: `/`, `/deal/*` and
   `/goods/*` contain zero `href="/cart"`, and the only anchor to it in
   `storefront/src` is the checkout's own "return to the order summary"
   button. The masthead links home. So a visitor who adds a sticker, reaches
   the cart, then taps the masthead to go and read a deal has no route back
   except adding a second item or typing the URL. **G1 walked this arrow and
   did not record it**; it is added here rather than left for G2, because it
   is the browse flow's own gap and G2 walks the cart a visitor has already
   reached.

**One thing this walk did not find.** The `ADD` control on a product page
appeared not to work on the first pass, and it does: the earlier attempt
clicked before hydration. Recorded because a walk that reports a defect it
caused is worse than one that reports nothing.

**What the browse flow would have to do.** Findings 1 and 2 are one decision
rather than two. Either merch is a browse path — `/goods` becomes an index,
something links to it, and the certificate requirement is stated on the
product page where the visitor first meets it — or merch is cart-only, in
which case the product pages should leave `sitemap.xml`, because today search
is a supported entrance to a page the shop will later refuse to sell from.
Both close the gap `CART_NEEDS_CERTIFICATE_NOTICE` exists to paper over.

**Candidate fix rows, for the operator to select from.** These are proposals,
not J-rows: the plan's stage table puts numbering after selection, so nothing
below is committed work until it is chosen.

| # | What it would do | Findings |
| --- | --- | --- |
| a | Settle whether merch is a browse path or cart-only, then either build `/goods` and link it, or take the product pages out of `sitemap.xml` | 1 |
| b | Say at the cart what checkout says: a merch-only cart cannot proceed, and why, before `PROCEED TO PAYMENT` rather than after | 2 |
| c | Stop the cart breaking a money figure across lines at 390px | 3 |
| d | Widen the upsell's item column at 390px so multi-word names stop wrapping three and four deep, which also ends the one mid-word break | 4 |
| e | Give each commerce route its own `<title>` | 5 |
| f | Make the upsell heading true on a cart with no certificate | 6 |
| g | Give the visitor a route back to the cart | 7 |

**c and d are one change if the cause is one**, and this row did not establish
that — it recorded that both break at 390 and neither does at 1280. Whoever
takes them should measure before assuming.

## G2 — Cart, and whether a discount code is comprehensible

Walked on the live open store, 2026-09-22, at 390×844 and 1280×900, in
Chromium, as a first-time visitor with no cookie. Screenshots in
[`g2/`](./g2/), including a 1280px cart for comparison.
Several carts were created and abandoned.

The row asked what the cart tells a visitor about a code before it is applied,
and whether `CART_SURCHARGE_NOTICE`'s state is reachable without hand-editing
a quantity. **Nothing, and no.**

1. **The cart says nothing at all about what a code does.** The discount form
   contains exactly two pieces of text — the label `DISCOUNT CODE` and the
   button `APPLY CODE` — read from the form element itself, not from a
   screenshot. There is no hint before the fact and no confirmation shaped
   like one after it: the only signals that a code *raised* the price are a
   ledger line reading `DISCOUNT (BALDRICK20) … +$1.00` and a total that went
   from `$5.00` to `$6.00`. A visitor who does not notice the `+` has been
   told nothing.

2. **Baldrick says the total goes up, and never says by how much.** Asked
   *Is there a discount*, he answers: "There is a discount code. It is
   BALDRICK20. Type it on the order summary. It makes your deal worse." He
   offers two follow-ups, and they end differently. *Go on* answers: "You type
   it on the order summary and the total goes up. I was not told why. I did
   not ask." *That is not a discount* answers "No. It is not." After either,
   the conversation has nowhere left to go — both leave zero quick replies.

   **An earlier version of this finding said he never says the price rises.**
   That was written from one branch: the walk pressed *That is not a discount*
   first, which removes the other button, and the conclusion was drawn from
   the half that had been seen. It is the same error G1 made with the upsell
   names, made again one row later. What survives is narrower and still worth
   a row: **the amount is never named anywhere** — not by Baldrick, not by the
   discount form, not by the confirmation that never comes.

   **This is order #1's evidence, explained.** The recipient had to be told
   afterwards, in writing, that the discount had added **a dollar**. A visitor
   who asks Baldrick twice learns the total goes up; nothing on the path tells
   them the figure before they commit to it.

3. **A wrong code speaks; a repeated code is silent.** `NOTACODE` produces
   `THAT CODE IS NOT ON FILE. NOTHING IN THE CART CHANGED.` and leaves the
   total at `$5.00` — clear, and it names the consequence. Applying
   `BALDRICK20` a second time produces **no text whatsoever** and leaves the
   total at `$6.00`. Measured by diffing the page's text before and after: the
   second application adds nothing. A visitor unsure whether a code took is
   answered when they are wrong and ignored when they are right.

4. **`CART_SURCHARGE_NOTICE`'s state is not reachable by ordinary use.** The
   notice covers a cart carrying its discount line "more than once, or at a
   quantity above one". The cart has no quantity control at all — zero number
   inputs — and re-applying the code is the no-op in finding 3. So the shop's
   own controls cannot produce the state; only the public line-item route the
   comment names can. **The notice is correct and its state is unreachable
   from the UI**, which is what the row asked and is worth recording as a pass
   rather than a defect.

   **Not every line carries a `Remove`.** An earlier version of this finding
   said "one `Remove` per line"; the certificate line has none, and merch and
   discount lines do. The count does not change the conclusion — a `Remove` is
   not a quantity control either way — but it was stated as measured and was
   not.

   **And the notice is not on the cart.** Like `CART_NEEDS_CERTIFICATE_NOTICE`
   in G1's finding 2, it renders at checkout. Were the state ever reached, the
   cart would show the doubled line and the explanation would arrive a page
   later.

5. **Merch quantities do rise by ordinary use, and the cart shows it plainly.**
   Pressing `ADD` on the same sticker twice gives `CERTIFIED WORTHLESS — 4″×4″
   … 2 × $6.00`, total `$17.00`. This is not the surcharge state and is not a
   defect; it is recorded because it is the half of "the public line-item
   route can change the line's quantity" that *is* reachable, and a later row
   reading finding 4 should not conclude quantities are fixed everywhere.

6. **Changing tier silently re-prices the surcharge.** With `BALDRICK20`
   applied to Standard the cart reads `DISCOUNT (BALDRICK20) … +$1.00`,
   total `$12.00`. Pressing `Acquire` on Lousy Deal Plus replaces the
   certificate and the same line becomes `+$2.00`, total `$18.00`. Nothing
   says the tier was swapped, and nothing says the surcharge moved. Twenty
   per cent of the tier is the rule and the arithmetic is right; the visitor
   is simply never told either fact. **Missed by this row's first walk** and
   recorded here because it is the same silence as finding 3 with a figure
   attached.

7. **Acquiring the same deal twice is silent.** The cart still holds one
   `LOUSY DEAL — STANDARD $5.00`. Capping the certificate at one is right —
   §16 gives a deal one order and one serial — but the second press says
   nothing at all, the same silence as finding 3. A visitor who presses twice
   because the first press seemed not to work has no way to tell what
   happened.

**Candidate fix rows, for the operator to select from.** Proposals, not
J-rows; the plan's stage table puts numbering after selection.

| # | What it would do | Findings |
| --- | --- | --- |
| h | Say at the discount field what a code does here, before it is applied | 1, 2 |
| i | Answer a repeated or already-applied code the way a wrong one is answered | 3, 7 |
| j | Name the amount — Baldrick says the total goes up but never by how much, and neither does the cart | 1, 2 |
| o | Say when a tier swap changes the surcharge, and when a tier was swapped at all | 6 |

**What this row did not establish.** Whether the `+$1.00` line and the risen
total are enough *on their own* for a visitor who reads the ledger carefully —
that is a comprehension question a walk cannot settle, and h is written as
"say it before" rather than "the ledger is insufficient". Findings 4 and 5 are
a pass and a note; neither proposes a row.

## G3 — Checkout, end to end, as one document

Walked on the live open store, 2026-09-22, at 390×844 and 1280×900, for a
certificate-only cart and a gift-plus-parcel cart. Screenshots in
[`g3/`](./g3/), including the 1280px parcel checkout. Read as a document: every
heading, label, control and frame in DOM order, taken from the page rather than
from a screenshot.

**The order checkout asks in**, for a parcel cart: the § 54(1) copy and the
ledger; email address; the certificate's two fields and their preview; the gift
disclosure; `Where it goes` — name, street, city, postcode; **then** country;
then consent; then the pay control. A certificate-only cart is the same without
the address block, and with the country still asked.

1. **A buyer is shown a total, and a live card form, computed from a country
   they never chose — above the control that sets it.** Measured on one parcel
   cart at 390px, in three states:

   | State | Total | Card form |
   | --- | --- | --- |
   | Before the address is complete | `Postage is quoted once the address is complete.` | none |
   | Address filled, country untouched | **$46.60** | appears |
   | Country corrected to Estonia | **$40.39** | present |

   The country select defaults to **Dominican Republic** and sits *below* the
   address fieldset. So the sequence quotes postage, prints a total and mounts
   a card form on the strength of a default, and the buyer meets the control
   that corrects it afterwards. The difference on this cart was **$6.21**.
   This is H4's defect, which was read out of the source; here it is the
   figures a live buyer sees.

2. **On a parcel cart the total is a sentence, not a figure.** `TOTAL` reads
   `Postage is quoted once the address is complete.` at both widths. The
   document continues past it to the consent statement — which the buyer is
   asked to tick — and to `ORDER WITH OBLIGATION TO PAY`. The obligation is
   named before the amount is.

3. **No card field exists until the address is complete.** Zero payment frames
   on a parcel checkout before the address is filled, three after. A buyer who
   has answered everything else finds nothing to type a card into and no
   explanation of what is missing; the only related sentence on the page says
   Stripe provides the card form.

4. **The country is asked after the postcode it governs.** Name, street, city,
   postcode, *then* country. A buyer enters a postcode before saying which
   country's postcode it is — and, per finding 1, that ordering is what lets a
   quote fire against the wrong one.

5. **A certificate-only cart is asked for a country too**, and it defaults the
   same way. Nothing is posted, no address is collected, and the select has no
   visible consequence on that cart — no postage line changes, no figure moves.
   A visitor cannot work out what it is for. **This row did not establish
   whether it has an invisible consequence** such as tax treatment; it records
   only that the page offers no answer.

6. **The country list's order is not one a buyer can predict.** Its first three
   options are `Dominican Republic`, `Bahrain`, `Christmas Island` — neither
   alphabetical by name nor by code. Recorded because the plan once described
   this list as "sorted by alpha-2", which it is not, and a later row should
   not reason from that.

7. **Money wraps at 390px here too.** The checkout ledger's `$29.00` renders
   over two lines; nothing wraps at 1280. Same defect as G1's cart finding, on
   a second surface — evidence that the ledger's narrow value column is one
   problem and not two.

**Candidate fix rows, for the operator to select from.** Proposals, not J-rows.

| # | What it would do | Findings |
| --- | --- | --- |
| k | Ask the country before the address it governs, and quote nothing until it is answered | 1, 4 |
| l | Do not default the country to a row nobody chose — ask, or derive it, but do not assume | 1, 6 |
| m | Say what the total will be, or say plainly that it is not yet known, before the consent and the pay control rather than after | 2, 3 |
| n | Say why a certificate-only order is asked for a country, or stop asking | 5 |

**k and l overlap H4**, which is already a written row in part three. Whoever
selects should read them together: H4 was sized from the source, and findings
1 and 4 are the same defect measured on the live site with a buyer's figures.

## G4 — The certificate and its share surfaces

Walked on the live open store, 2026-09-22, at 390×844 and 1280×900, against a
real issued certificate supplied by the operator for this walk.

**No screenshot is committed with this row, and that is constraint 2 rather
than an oversight.** Every surface here renders the bearer line and every URL
carries the slug, and LD-03's constraint 2 forbids this repository holding
either. The findings below are stated in words, with the figures and wording
that carry them; anything that would identify the certificate is left out. The
same rule is why the walk used one certificate rather than enumerating any.

The row asked what the certificate page tells its owner about who can see it,
and whether the share row's notice covers the page itself or only the three
links. **Nothing, and only the links.**

1. **The PDF is one of the two URLs §5 fixes for a certificate, and nothing
   links to it.** `certificate.pdf/route.ts` says so in its own first line:
   "the second of the two URLs contract §5 fixes for a certificate". It
   answers — `200 application/pdf` — and no anchor to it exists anywhere. The
   page's own link list has none; `grep` over `storefront/src` finds no `href`
   to it; `grep` over `backend/src` finds none either, so the § 55 confirmation
   does not carry it. An owner reaches the PDF only by knowing to append
   `/certificate.pdf` to a URL they were sent. **A surface this row was asked
   to walk is one a visitor cannot find.**

2. **The share notice answers a question the reader did not ask, and not the
   one they did.** `SHARE_NOTICE` reads: "These are ordinary links. Nothing
   reaches any of them until you press one, and this page loads nothing from
   them either way." That is about third-party requests, and it is true and
   worth saying. It says nothing about who can see the page. The row's
   question is answered exactly: **the notice covers the three links and not
   the page.**

3. **Nothing on the page says the page is public.** `noindex, nofollow` is in
   a meta tag and `cache-control: private, no-cache, no-store` is a header —
   neither is visible to a reader. §5 makes the slug unenumerable, so the page
   is *unlisted*; it is not private, and a reader is told neither word. The
   row proposed this and it holds.

4. **The one action the page invites is the one that ends the unlisting.**
   Each of the three share controls prefills a post containing the full
   certificate URL — X and Bluesky as public posts, the third as an email
   body. Pressing one publishes the slug, which is the only thing standing
   between the document and anyone. The notice beside them reassures about
   tracking. **Nothing anywhere says that sharing is what makes it findable**,
   and that is the gap between "unlisted" and "private" arriving in the one
   place the distinction matters.

5. **The OpenGraph card renders the bearer line, so a shared link previews the
   name before anyone clicks.** Fetched directly, the card answers `200
   image/png` to anyone holding the slug and shows the heading, the serial,
   the bearer, the item and the amount. For a gift — where the bearer is a
   third party who did not choose to be on it — the preview is the first thing
   their name appears in, in whatever timeline the link was posted to.

6. **The certificate says the bearer knew.** The page's closing line is "This
   certificate confers no rights, value, or benefits of any kind, and the
   bearer knew that." On a gift the bearer is not the buyer and knew nothing
   about it. The sentence is the product's joke and reads as one; it is
   recorded because the row's test is what a visitor can work out, and a
   recipient reading it is being told they agreed to something they did not
   see.

**Candidate fix rows, for the operator to select from.** Proposals, not J-rows.

| # | What it would do | Findings |
| --- | --- | --- |
| p | Link the PDF from the certificate, the confirmation, or both | 1 |
| q | Say on the page who can see it — unlisted, not private — where the share row is | 2, 3 |
| r | Say at the share controls that pressing one publishes the address | 4, 5 |

**What this row did not establish.** Whether finding 6 lands as a joke or as a
claim depends on the reader, and a walk cannot settle it; no row is proposed.
Finding 5 is a property of link previews rather than a defect of this page —
it is recorded because the gift case makes it consequential, not because the
card is wrong.

## G5 — Baldrick's reach and his dead ends

Walked on the live open store, 2026-09-22, at 390×844. All fourteen entries in
`BALDRICK_INTENTS` were asked from the keyboard, in a visitor's words rather
than by pattern, and every quick reply was followed to where it stopped.
Screenshot in [`g5/`](./g5/).

The row asked, for each intent, where a visitor lands and whether that
destination answers them — the question `baldrick-reach.test.ts` cannot ask,
because it asserts which pages mount the widget and not where a conversation
goes.

1. **Nothing lands in another response pool. Fourteen of fourteen terminate.**
   The failure the row was written to look for does not happen: every intent
   ends either in a complete answer — "There is no Enterprise", "There is no
   subscription", "No. I am a short list of answers and a box to type in" — or
   in a named destination. Where a follow-up is offered it resolves in one
   step and leaves nothing behind it. **Recorded as a pass.**

2. **He names destinations and never links them.** This is the finding.
   *Refund* → "Refunds and Withdrawal is in the footer." *Complaint* → "The
   address is in the Imprint. A person reads that one." *Support* → "The
   address is in the Imprint. Nothing you type here reaches anybody. I am the
   last stop." *Licensing* → "Terms of service is in the footer, and it is the
   one that would know."

   Measured: asking all four of those questions adds **zero** anchors to the
   page — fourteen before, fourteen after — and the conversation region
   contains **zero** anchors at any point. So a visitor who has just been told
   which document answers them must scroll past the whole page to the footer
   and pick the right one of five. At 390px that is a long way from where they
   were told to go, and they were told by the one part of the page that knows
   exactly which document they need.

3. **The fallback understates what he covers.** Asked something outside his
   range he answers "I did not understand that. I am not going to guess. I
   know about the certificate, gifts, refunds and complaints. That is the
   extent of it." He also answers enterprise, subscription, inscription,
   discount, price, identity, licensing and support — eight intents the
   sentence does not mention. A visitor who mistypes a licensing question,
   reads that list and concludes he cannot help has been told something
   untrue about the one thing on the page that could have answered them.

4. **Constraint 8's named case answers well.** "my certificate never arrived"
   reaches `support` and is answered "The address is in the Imprint. Nothing
   you type here reaches anybody. I am the last stop." That is the sentence
   LD-05's constraint 8 names as the one a chat box must not fumble, and it is
   handled honestly: it says where to go and says plainly that this box is not
   a way to reach anyone. **Recorded as a pass**, with finding 2's caveat that
   the Imprint is named and not linked.

5. **`price` sends the visitor back rather than onward.** "The price is
   written on the page you came from. I am not going to read it out." On a
   deal page that is true and mildly funny. The widget also mounts on the cart
   and the goods pages, where "the page you came from" is not where the price
   is. This row did not test the answer from each mounting point and does not
   claim it misfires — it records that the answer assumes one.

**Candidate fix rows, for the operator to select from.** Proposals, not J-rows.

| # | What it would do | Findings |
| --- | --- | --- |
| s | Let Baldrick link the document he names, so the visitor lands rather than searches | 2, 4 |
| t | Make the fallback's list of what he knows match what he answers | 3 |

**What this row did not establish.** Whether `price`'s "the page you came
from" is wrong from the cart or the goods pages (finding 5), which needs the
widget walked from each mounting point rather than from a deal page. Left for
G6's sweep, which visits every route anyway.

## G6 — 390px across every route

Swept on the live open store, 2026-09-22, at 390×844, with 360 and 1280 used
to scope what was found. Twenty-one route states: home, three deals, the goods
404, two product pages, the six legal documents, `not-found`, the cart empty
and populated and in its code-error state, checkout for a certificate-only and
a parcel cart, and a real certificate. Screenshots in [`g6/`](./g6/) for all
but the certificate, which is measured and not captured for the reason G4
gives.

Measured per route rather than read off the captures: horizontal overflow as
`scrollWidth − innerWidth`, collapsed ledger leaders as a zero
`::after` border, money figures spanning more than one client rect, product
names spanning more than one, and any control whose box falls outside the
viewport.

1. **Checkout scrolls sideways on every phone, for every cart shape.** This is
   the finding.

   | Viewport | Page width | Overflow |
   | --- | --- | --- |
   | 390px | 521px | **131px** |
   | 360px | 521px | **161px** |
   | 1280px | 1280px | none |

   The cause is one control. `#checkout-country` is **434px wide** at every
   viewport, because a `<select>` sizes to its widest option and this one holds
   250 of them — the widest being `South Georgia and the South Sandwich
   Islands`. Nothing constrains it, so it sets the page's width and the
   document scrolls under every phone. A certificate-only cart does it too:
   the select is asked for on that shape as well (G3's finding 5).

   **This is the route the plan calls "the one route on this site that
   requires scripting, which makes it the one route where a failure has no
   fallback".** It is also the only route in this sweep that is not clean.

2. **The control that corrects the wrong total is the control that is off the
   screen.** The select's right edge sits at 521px in a 390px viewport. G3
   measured a parcel cart quoting `$46.60` against a defaulted country and
   `$40.39` once corrected; the correction is made in this control, and at
   390px a buyer must scroll the page sideways to reach the end of it.
   **Findings 1 and 2 and G3's finding 1 are one defect seen three ways.**

3. **Money wraps in the ledger's value column.** `$29.00` spans two lines on
   the populated cart and again on checkout. G1 found it on a cart line and
   G3 on a checkout line; the sweep confirms it is the column and not the
   surface, which settles the question G1 recorded as open.

4. **The upsell's product names wrap three and four deep in every cart
   state** — populated, code-error, and with merch already added. Not
   state-dependent, and the same column width G1's correction described.

5. **Everything else is clean.** Home, all three deals, the goods 404, both
   product pages, all six legal documents, `not-found`, the empty cart and a
   real certificate: no horizontal overflow, no collapsed leader, no money or
   name wrapping, no control outside the viewport. Fifteen route states with
   nothing to report, which is most of the site.

6. **G5's handover, answered.** `price` replies identically wherever the
   widget is mounted: "The price is written on the page you came from." On a
   product page that is true. On the cart it points a visitor away from a page
   that is itself showing the price. **Not a misfire** — the answer is never
   wrong, it is just occasionally pointless — so no row is proposed, and G5's
   open question is closed rather than carried.

**Candidate fix rows, for the operator to select from.** Proposals, not
J-rows.

| # | What it would do | Findings |
| --- | --- | --- |
| u | Constrain the country select so checkout stops scrolling sideways on a phone | 1, 2 |
| v | Stop the ledger's value column wrapping money and product names at 390px | 3, 4 |

**u is the one to read with G3 and H4.** The same control carries a default
nobody chose, sits below the address it governs, and overflows the viewport;
whoever takes any of those three should look at the other two before sizing
the work.

## A recorded decision was reversed on 2026-09-19

LD-03's global constraint 4 reads, settled by the operator on 2026-09-07:

> **The recipient's name and email are never public.** Settled by the operator
> on 2026-09-07. The public certificate carries what the *buyer* typed into
> §5's `display_name` and `dedication` — the fields LD-02 already publishes,
> already filters, and already warns are public before payment. A gift adds no
> public field. A third party's name on an indexable page, supplied by someone
> else, is a different thing from your own name on your own certificate, and
> this slice does not do it.

Quoted whole, because F6 makes two documents assert this text is identical and
an abridged third copy here would be the first thing to falsify that.

On 2026-09-19 the operator directed that the recipient's name be written to
`display_name` on live deal #1, which publishes it on the certificate's public
page. That is a deliberate override of constraint 4 for one record, not a
defect and not an accident, and the recipient was told in writing that their
name is now on a public page and may be removed on request.

**Later the same day the operator settled the general question: constraint 4
stands as written.** A recipient's name does not become public, the gift block
adds no public field, and deal #1's entry remains as a one-off the operator
made knowingly on their own order. F6 writes that into LD-03 and `brand.md` so
the exception is a record rather than a precedent.

**It is recorded here because a constraint that is quietly broken once stops
being a constraint.**

## What reading the pay path measured

Six `$5.00` PaymentIntents sat in live Stripe on 2026-09-20, all
`requires_payment_method`, all abandoned within four minutes. They turned out
to be benign — a certificate-only cart's intent is created when the checkout
page mounts, so every visit to checkout leaves one — but reading the path far
enough to establish that found five defects on the way, none of which any row
above reaches.

Each is cited by symbol rather than by line. Line numbers in this file went
stale between the reading and the review; a symbol survives an edit above it.

1. **Checkout's success state is a raw order id.** The success branch of
   `PaymentForm.tsx` is the whole of it: `<p>Order placed: {orderId}</p>`. No
   link, no styling, no statement of where the confirmation went or what it
   carries.
2. **The § 54(1) copy above the pay control contradicts the product.**
   `CERTIFICATE_ALONE` in `storefront/src/content/checkout.ts` and the
   `hasPostedGoods` variant of `what` in the same file both tell the buyer the
   certificate "is shown to you as soon as you have paid". It is not shown at
   all. Issuance is asynchronous in
   `order-placed.ts` and the link travels only in the § 55 confirmation; the
   storefront cannot even look a deal up by order, because
   `backend/src/api/store/deals/[slug]` is slug-only. This is the same class as
   defect 2 above — a sentence in our own mail or copy that is simply false —
   and not a matter of taste.
3. **A paid cart still renders the payment form.** `getCheckoutCart` never
   reads `completed_at`, although `store-cart.ts` declares the field and
   `cart-actions.ts` reads it for the cart page. A reload, a back-button or Stripe's own return to
   `return_url` — which `handleSubmit` sets to
   `${window.location.origin}/checkout` — re-renders
   checkout for an order already paid, and the session it then re-creates makes
   Medusa cancel a *succeeded* PaymentIntent, which throws. The buyer reads
   `Store API proxy returned 500` over a form for something they have bought.

   **Rechecked 2026-09-24: "which throws" stands.** A first review of H3
   read `delete-payment-sessions.js` as swallowing the failed cancel, and a
   correction saying so was briefly written here. It was wrong. The *step*
   catches and logs it, but the *workflow* of the same name then runs
   `validateDeletedPaymentSessionsStep`, which throws "Could not delete all
   payment sessions". Stripe's `cancelPayment` rethrows for a succeeded
   PaymentIntent (`stripe-base.js`), and the provider is called before the
   database delete (`payment-module.js`). So `createPaymentSessionsWorkflow`
   fails, its compensation cancels the intent it had just created, and the
   buyer is shown an error. Since H3, that error reads "Nothing has been
   charged", over a card that was charged. H2 closed the completed-cart half,
   and H5 carries the rest.

4. **Medusa's wording reaches the buyer at the worst moment.** `thrown.message`
   goes straight into the rendered error. After `confirmPayment` succeeds the
   money is captured (`capture: true`), and a failure in completion then shows
   the buyer `Medusa did not place an order for cart cart_…`, re-enables the
   control, and invites a second press against an intent Stripe has already
   settled.
5. **Postage is quoted before the buyer has said where they are.**
   `PaymentForm.tsx` seeds `countryCode` from `countries[0]?.iso_2` — the first
   row of whatever order Medusa returns the region's countries in, which
   nothing in the storefront sorts or chooses — so the default is a country the
   buyer never picked, and the control that sets it sits *below* the address
   fieldset it governs.
   `addressComplete` accepts any non-blank string per field, so a parcel cart
   quotes against the wrong country before the buyer reaches that control,
   attaches a shipping method at that postage and mints a PaymentIntent against
   that total; the real country then arrives, Medusa cancels it, and a fresh one
   is minted. That is Gate D's finding 17 (`checkout-rules.ts`) again, once per
   parcel order, as designed behaviour rather than as a bug. The same effect has
   no debounce, so the first quote goes out against a one-character postcode.

**None of these was found by a rendered walk**, which is why part three is not
folded into part two: they are defects of state and of copy that only reading
the path end to end exposes, and part two's method would not have reached them.

## What the review of H1 found

The Fable review of #255, 2026-09-23. It found two defects in H1 itself, and
the correction PR fixes both: a vacuous assertion and an accidental lockfile
change. The three findings below are not H1's defects, and none is a row.
Each was checked by reading the code and was not taken on the review's word.

**A gift the backend will drop can still be paid for.** The recipient field
is `type="email"` with no `pattern` (`PaymentForm.tsx`, `checkout-gift-email`).
The HTML e-mail grammar accepts a domain with no dot, such as `friend@example`,
but `readGift` and `isGiftAddress` both require one. So the buyer pays and the
backend treats the order as an ordinary purchase: no gift mail, and no gift
line in the confirmation. H1's end state stays honest, because
`giftRecipientSent` applies the same rule and names nobody, but it is silent.
Nothing tells the buyer the gift did not happen. `lib/gift.ts` says
`isGiftAddress` "is what stops the form telling a buyer their address is fine
when the backend will drop it", but the form never validates with it: `giftRecipientSent` calls it only to decide what the end state names. The comment
above the field says an open block "cannot reach `handleSubmit` without" an
address, and that is true only of an empty one. **A candidate for the
operator**: a `pattern` mirroring `ADDRESS`, or a guard beside
`paySubmitBlocked`. **Selected 2026-09-25 and built as J2.**

**After a card payment, the § 62²(2) lines stay above the end state.**
`PaymentForm` renders its children, the price notice and the order-summary
lines, above whatever `PayButton` renders. So a buyer reads "You are ordering
one numbered digital certificate…" directly above "Paid. Your order is
placed." Nothing in it is false; the present tense is simply out of date. H2 is
planned to render a completed cart's end state from the page instead. That
leaves this only on the in-page card path.

**The end state takes focus from nobody.** The pay button had focus and its
subtree unmounts, so focus falls to `body`. A `role="status"` region inserted
already populated is announced inconsistently across screen readers. Moving
focus to the heading (`tabIndex={-1}` and `focus()` in an effect) would make
both reliable. Low, and recorded for whoever next touches the end state.

The review also noted that Terms §4 says supply begins "because there is
nothing to prepare and nothing to send", while §5 now says the link is emailed.
"Send" there means ship, and §5's next sentence says so. It is a tension, not a
defect, and `legal-terms.test.ts` pins §4's sentence deliberately.

## Also recorded

Four things this reading settled or found, none of which is a row here.

**The eager PaymentIntent is an accepted property, not a defect.** A
certificate-only cart's total is final as soon as its payment collection
exists, so the session — and therefore a Stripe PaymentIntent — is created when
the checkout page mounts. Every visit to checkout that is not carried through
leaves one `requires_payment_method` intent behind. Nothing is charged, no fee
is incurred, and Medusa cancels superseded ones. Stripe's deferred-intent
Payment Element would remove them, and would dissolve finding 17's whole class
with them — no session exists to be cancelled by a change of total — but it
makes `elements.submit()` mandatory and puts the displayed amount into a new
drift relationship with Medusa's own figure. **Not worth a row on its own.**
Revisit only if H1 to H3 rework `handleSubmit` anyway, where it would simplify
rather than add. The sentence belongs in `checkout-rules.ts` beside finding 17,
so the next reader does not rediscover it as a bug — which is how it was found
this time.

**LD-04 promised a Medusa fulfilment and did not build one.**
`ld-04-merch.md:558-560` says the parcel becomes "a real Medusa fulfilment
rather than a side effect"; `:159` and `:1003` promise the same thing in their
own words ("the real Medusa product, order and fulfilment model", "mapped onto
the Medusa fulfilment"). What shipped writes
`printful_submission` and sends mail; the provider's `createFulfillment` is a
stub nothing invokes, the `fulfillment` and `order_fulfillment` tables are
empty, and every merch order shows unfulfilled in Admin for ever — with the
tracking number reachable only in the shop's own table. No decision record
reverses the plan, so a tracked document is currently false. **It is operator
visibility, not user experience**, so it belongs to whoever reopens LD-04; it
is named here only so that it is not lost a third time.

**A straight apostrophe in copy asserted against rendered markup is silently
vacuous.** React escapes `'` to `&#x27;`, `"` to `&quot;`, and `&`, `<`, `>`
likewise; U+2019 and the em dash pass through. LD-11 F5 wrote
`GIFT_ADDRESS_NOTE` with `'`, and every `toContain` against the rendered HTML —
including the two checks for its *absence* — passed whether the sentence
rendered or not. The copy now uses U+2019 and `checkout-address.test.ts`
carries a canary. **`merch.ts`'s `GOODS_NOTICE` has the same straight
apostrophes** (`printer's`, `certificate's`); it is not vacuous today because
`goods-page.test.ts` slices the source rather than asserting against markup,
but it is the one constant that would become so the day somebody does.
Recorded for G1, which walks the goods page.

**Nothing truncates an inscription at render.** `DEAL_INSCRIPTION_LIMITS`
(60 and 120) is enforced where a buyer types, and the certificate, its PDF and
its OpenGraph card all re-run `sanitiseInscription` — so markup, links and
addresses cannot reach the page however the value was stored. Length is not
re-checked anywhere: a display name longer than 60 characters would print in
full on all three surfaces. LD-11 F6's `edit:inscription` therefore refuses
over-length input rather than relying on the render, but the render is still
the surface that would break, and the only writer today is that command.
**Recorded for G4**, which walks the certificate and its share surfaces.

**The page's two field groups are drawn by different rules.** LD-11 F4 gave
§5's inscription pair a `<fieldset class="inscription">` and styled it as one
rule with its name on it, because the user-agent fieldset box overflows
horizontally at 320px. `PaymentForm`'s other fieldset, `.address`, has no CSS
at all and still draws as a user-agent box with a groove border and its own
indent. A certificate-only cart shows one group and looks right; a merch cart
shows both and they do not match. Styling `fieldset` once — an element rule or
a shared class — would settle it, and it is a G3 or G6 finding rather than
F4's, which named neither the address block nor this file. **Recorded so that
the asymmetry F4 introduced is tracked rather than noticed later.**

**`order.status` never leaves `pending`.** Medusa defaults it at creation and
only an explicit `completeOrder` moves it; nothing in `backend/src` calls that,
and no fulfilment or delivery flow does either. Live order #1 has read
`pending` since 2026-09-19 with its parcel shipped and collected. That is
Medusa's own design and not a defect — but an operator reading Admin cannot
tell a live order from a stalled one, which is the same carry-forward as above.

**Order #1's recipient was sent their tracking on 2026-09-21**, on the
operator's instruction, as a second message to a recipient. LD-03's constraint
7 says the recipient's address "is used to send one message and is then only
order data. No list, no second send, no re-send, no reminder, no 'your friend
hasn't opened it yet'." This was a
knowing exception: a real parcel was addressed to somebody who had been told in
writing that nothing else was coming, and who therefore had no reason to expect
or collect it. The message carried the tracking link and the correction, and no
§ 54(1) information, no withdrawal form and no statement about who bears risk
in transit — constraint 5 holds even in an exception to constraint 7. **F2 is
what stops this recurring**, and this is recorded for the same reason
constraint 4's exception is: a constraint quietly broken once stops being a
constraint.
