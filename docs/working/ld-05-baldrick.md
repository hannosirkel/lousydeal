# LD-05 — Baldrick

Build the site's deterministic sales and support character: a chat that is
completely predictable, costs nothing to run, and is funny because it is honest.

The contract is [`fresh-build.md`](./fresh-build.md); this slice executes its
§17 LD-05 line against §8 (Baldrick) and §23 (legal and payment UX). It builds
on [LD-09](./ld-09-visual-identity.md)'s identity, [LD-02](./ld-02-certificates.md)
and [LD-03](./ld-03-gifting.md), all complete.

**No LLM, and that is the whole engineering premise.** §8 says so outright.
Every reply is a string this repository ships, chosen by rules this repository
can test. Nothing is generated, nothing is inferred, nothing calls out. Limited
comprehension is not a defect to be engineered away — §8 says it "can be part
of the character", and a bot that misunderstands you in a consistent way is
funnier and cheaper than one that half-understands you differently each time.

**§9's surcharge mechanics are not this slice.** They are LD-06. Baldrick's
`discount` intent exists here and has something to say; what it must not do is
issue a code, because no code does anything yet and a control that does nothing
is the thing `brand.md` forbids.

**Execution.** Directly, not through `big-build`. Eight rows, one pull request
each, in `lousydeal` only. No `deploys` or `orange` change: no secret, no
environment value, no network destination.

## The decision this slice opens with

**Baldrick needs client-side JavaScript and animation, and `brand.md` §6
forbids both.** That list reads "no client-side JavaScript for anything except
the consent checkbox, the Stripe payment element, and the two error boundaries"
and "no animation beyond a 120ms colour change and the loading cursor". §8 asks
for typing indicators, realistic pauses and messages that arrive one at a time.
The two cannot both stand.

LD-09 anticipated it: "Baldrick is out of scope here. He arrives in LD-05 and
needs his own voice section, written then." So amending is legitimate; how far
was the operator's call, taken on 2026-09-08.

**The answer is a real chat widget**, with the identity amended to admit it,
rather than a server-rendered transcript. B1 writes both amendments and the
voice section, and it is the first row for that reason: nothing else in this
slice is authorised until the identity says it may exist.

**With scripting off, Baldrick is not rendered at all.** Not a dead input, not
a disabled button — `brand.md` already says a control that does nothing is a
lie, and a chat box that cannot send is exactly that. This costs nothing a
buyer needs: the only thing §8 has Baldrick gate is Enterprise, and §10 defers
Enterprise out of V1 entirely. Every purchase path on this site continues to
work without scripting, which is the property LD-02's withdrawal row defended
and this slice does not touch.

**That decision needs a mechanism, and the obvious implementation produces the
artefact it forbids.** A `"use client"` component is still rendered on the
server — that is how all four of this repository's client components already
work — so shipping the widget naively puts a dead chat box in the HTML of every
no-script visitor, which is the exact lie the paragraph above rejects. B5b
mounts him behind a gate: `null` on the server and on first paint, mounted in
an effect. The consequence is that he appears after hydration, so he must sit
where his arrival shifts nothing above him. B6's "asserted on the served HTML"
then has something real to assert.

## Global constraints

LD-03's, carried forward. What follows is what this slice adds or sharpens.

1. **Never commit a secret.** Unchanged, and this slice introduces none.
2. **No network call, from either side.** Baldrick answers from data in the
   bundle. No API route, no fetch, no telemetry, no third-party host — which
   also means `third-party-disclosure.test.ts` needs no exception, and a row
   that needed one would be doing something this slice forbids.
3. **One pull request closes one row**, 800 lines and 10 files, operator
   override by name.
4. **Deterministic means testable, and the test is the definition.** Given the
   same input and the same seed, Baldrick says the same thing. Randomised pools
   are seeded from the conversation rather than from `Math.random()`, so a test
   can assert a whole exchange and a bug can be reproduced from a transcript.
5. **He never states a price, a total, or what something costs.** Those come
   from the Store API on surfaces that read it. A character quoting a figure he
   made up is the fabrication §11 and `AGENTS.md` forbid, and it would be the
   first place on this site to do it.
6. **He never gives legal information — but he may name the document that
   does.** Not a rule about words, a rule about claims. He states no
   entitlement, no period, no provision and no outcome; he may say "that is a
   matter for a document" and name it. Banning the word "withdrawal" outright
   would forbid him naming *Refunds and Withdrawal*, which is the pointing this
   constraint exists to require. He points at the **Imprint** for contact
   details rather than carrying an address, because decision `004` keeps the
   trader's details out of literals and a line in `content/baldrick.ts` would
   be exactly the literal it forbids.
7. **He stores nothing, anywhere.** No `localStorage`, no `sessionStorage`, no
   cookie, no server. `browser-storage-disclosure.test.ts` already guards this
   repository's storage claims, and B5b cites it as proof rather than adding
   one. A conversation lasts a visit and a navigation ends it, which the widget
   says rather than implies.
8. **He is not a support queue, and says so where it can be read.** A widget
   with an input that answers questions *is* what a support queue looks like,
   so the disclaimer cannot wait for an intent to match: a standing line under
   the input, always rendered, says nothing typed there is stored, sent or read
   by a person, and sends correspondence of record to the Imprint. That line is
   also what keeps the Privacy Policy true without amendment, which is why this
   slice has no privacy row.
9. **A row that falsifies a tracked document carries it.** LD-02's constraint 9.
10. **No emoji, no exclamation mark**, in his voice as everywhere else.
    `brand.md` §6 is not amended on that point and this slice does not ask.

## Current repository facts

Measured against `origin/main` at `62b02a5`, 2026-09-08.

| Fact | Where | Consequence for this slice |
| --- | --- | --- |
| Four client components exist | `error.tsx`, `global-error.tsx`, `checkout/page.tsx`, `checkout/PaymentForm.tsx` | Baldrick is the fifth and the first that is neither a framework requirement nor a payment form. B1 is where that is authorised. |
| The storefront has six runtime dependencies | `storefront/package.json` | Baldrick adds none. A chat library would bring a design system this identity forbids and a bundle for a character who says forty sentences. |
| `prefers-reduced-motion` is honoured for CSS only | `globals.css:878` | **It does not reach a `setTimeout`.** The indicator's blink is CSS and inherits it; the pauses between messages and the one-at-a-time arrival are JavaScript timers and do not. B5a reads `matchMedia` and collapses the delays to zero, and the test asserts that rather than asserting the indicator is CSS. An earlier draft of this plan claimed the whole thing was inherited for free, which would have shipped the full theatrical pause schedule to a reader who asked for no motion. |
| One animation already exists | `globals.css:866`, `cursor-blink` | The typing indicator is the second, and `brand.md` §6 names both after B1. |
| `third-party-disclosure.test.ts` scans the source for external hosts | `storefront/tests/` | Constraint 2 means this guard keeps passing unchanged, which is the cheapest proof that Baldrick reaches nothing. |
| The layout renders `children` and a footer on every route | `storefront/src/app/layout.tsx:99` | Where Baldrick is mounted is B6's decision, and mounting him in the layout would put a client component on every document including the certificate. |
| Nothing in the repository stores a conversation | — | Constraint 7. State lives in the component for the length of a visit and is not persisted, which is also why no privacy-policy row appears in this slice. |
| No test reads `brand.md` §6 | `storefront/tests/` — `tokens.test.ts` asserts contrast ratios and is the nearest thing | B1's amendment is prose held by Gate D, not by a guard. The row says so rather than hedging about a test that might exist. |
| `browser-storage-disclosure.test.ts` guards storage claims | `storefront/tests/` | Constraint 7 means it keeps passing unchanged, which is the cheapest proof Baldrick persists nothing. |
| `legal-consistency.test.ts` collects eight surfaces | `storefront/tests/` | If Baldrick ever mentions the confirmation or the right of withdrawal he becomes the ninth. Constraint 6 is what keeps him off that list. |

## Target exposure

Both environments, both behind Cloudflare Access. §23's legal gate precedes
publication and this slice does not close it.

**Nothing here reaches outward at all.** No mail, no network call, no third
party, no stored data. It is the first slice since LD-01 with no external
surface of any kind, which is worth stating because it makes the risk profile
of this slice almost entirely about what Baldrick *says* rather than what he
does.

## Completion criteria

| # | Criterion | Row |
| --- | --- | --- |
| 1 | `brand.md` has Baldrick's voice section and the two §6 amendments, each written as an amendment rather than a silent edit | B1 |
| 2 | The same input produces the same reply, provably, from a seed the test controls | B2 |
| 3 | Every intent §8 lists is recognised, and the fallback is a character rather than an error | B2, B3 |
| 4 | A conversation has state: quick replies advance it, and a flow can be re-entered without breaking | B3 |
| 5 | Messages arrive one at a time with an indicator, and a reader who asked for no motion gets no pauses — not merely no blink | B5a, B5b |
| 6 | With scripting off, no Baldrick in the served HTML and no dead control | B5b, B6 |
| 7 | He quotes no price, gives no legal information, invents no figure or customer, and takes no message | B4, B6 |
| 8 | He is reachable from named routes and provably absent from the rest | B6 |
| 9 | A reader who cannot see the page is told when a message arrives, is not told twice, has focus taken from nothing, and can drive the whole exchange from the keyboard | B5b |
| 10 | He is on `legal-consistency.test.ts`'s list as the ninth surface, and says nothing that list watches for | B4 |
| 11 | Gate D on every row, Gate E on the rendered widget, and the record | B7 |

## Rows

Eight, after B5 was split at planning rather than at execution: as one row it held a component, a stylesheet, a scheduler, the reduced-motion handling, the no-scripting gate and the accessibility behaviour, which does not fit §18's bound honestly in a codebase whose one comparable component is 552 lines. Each row names its files and its one checkbox.

### B0 — This plan

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-05-baldrick.md`, `docs/working/status.md`.

- [x] Land the plan and move the resume point to it.

### B1 — The identity admits him

**Repository:** `lousydeal`.
**Files:** `docs/current/brand.md`.

- [x] Write Baldrick's voice section and the two §6 amendments, as amendments.

**First, because nothing else is authorised until it lands.** §6 is written as
"a single list, so a later surface does not have to re-derive it", and a row
that added a client component while that list forbade one would be deriving its
own permission.

Two amendments and no more: a fourth client-side exception, and a second
animation. Everything else in §6 stands — no icon, no mascot, no card, no
border radius, no emoji, no exclamation mark. **Baldrick has no face**, which
is a constraint the voice section should state positively rather than leave to
be discovered: he is a name and a column of text.

**No test reads §6, and this row does not write one.** The facts table records
that; the amendment is prose, held by Gate D and by review, and pretending
otherwise with an "if one exists" file would be the hedge this plan's own
standard forbids.

The voice section is what LD-09 deferred, and "eager, confident, wrong" is not
enough to write forty lines that sound like one person. It must carry, in this
order:

1. **The character, which the operator settled on 2026-09-08: he is lazy.** Not
   eager, not cheerful, not a helper. A sales assistant who cannot be bothered,
   employed by a shop that sells nothing — two facts that explain each other.
   An earlier draft of this plan said "eager, confident, catastrophically
   wrong", which was a borrowed characterisation and is not what is being
   built.
2. **Why laziness is the safer character, stated because it is not obvious.**
   §11 forbids invented customers, totals, testimonials and social proof. An
   eager assistant strains against that wall constantly, because enthusiasm
   invents; a lazy one never approaches it, because making something up is
   work. His failure mode is telling you less than you wanted, which is the
   harmless direction.
3. **The reconciliation rule.** He is wrong about his own *effort*, never about
   a *fact the site states*. Reluctant, unhelpful, dismissive of a question he
   could easily answer — but never wrong about what the product is, what it
   costs, or what the law gives you.
4. **How laziness reads with no exclamation marks.** Short sentences. Flat
   statements. He answers the question asked and stops before the sentence that
   would have helped. No apology, no alternatives, no "anything else?".
5. **Mechanics.** First person. The product is "certificate" and never anything
   else, under §2's same-word rule. One to three messages a turn. He never
   claims to remember, look up, send or forward anything.
6. **A worked-example table**, the instead/write shape §2 already uses, because
   that is what actually transmits a register to a later writer.

**The name is a name.** It refers to no existing character and borrows nothing
from one — no catchphrase, no inherited running gag, no wink at a reader who
thinks they recognise it. The operator settled that on 2026-09-08, and the row
records it as a decision rather than enforcing it with a guard: a test that
policed a resemblance would be policing prose against a thing it cannot see.

**He has no face**, which the section states positively rather than leaving to
be discovered: he is a name and a column of text.

**The indicator's own honesty is decided here.** Nobody is typing. Everywhere
else this repository chose the true version over the conventional one — form
numbers rather than invented order numbers, `Nothing yet. You could be the
first, which is worse.` rather than a seeded counter. A "typing" indicator
asserts a person. The accessible text must not say typing, and the row decides
whether the visible caption says something truer, along the lines of *Baldrick
is selecting a pre-written response.*

### B2 — Recognition, and the pools

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/baldrick/intents.ts`,
`storefront/src/lib/baldrick/pool.ts`, `storefront/tests/baldrick-intents.test.ts`.

- [x] Match what a visitor typed to one of §8's intents, deterministically.

Keyword and phrase matching, as §8 says, and nothing cleverer. The ten intents
it lists — discount, Enterprise, support, refund, complaint, gift, what do I
get, price, subscription, fallback — plus whatever the copy row finds it needs.

**The pool is seeded, not random**, and "seeded from the conversation" is
hand-waving until the machinery is named, so the row names it:

- **What feeds the hash:** the visitor's typed inputs and the ids of quick
  replies they pressed, in order. Not Baldrick's own replies — those are
  derived from the seed, and feeding them back is circular.
- **Normalisation: none.** Reproducing a transcript requires the exact text
  typed, so the hash takes it verbatim and the transcript records it verbatim.
- **The functions, committed and dependency-free:** FNV-1a for the hash and
  mulberry32 for the generator, about a dozen lines together. No dependency is
  added for this.

**And the consequence is stated rather than discovered.** Every visitor whose
conversation starts the same way gets the same lines, for ever — the pool gives
variety only after conversations diverge, and most start with "hi". That is on
character: §8 asks for "completely predictable", and a bot that greets everyone
identically is more consistent, not less. It is a decision, not an accident.

**Ambiguity resolves in a stated order, and the order is a decision.** A
message matching both `refund` and `complaint` has to go somewhere; the row
picks and says why rather than letting declaration order decide silently.

### B3 — Flows, state, and quick replies

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/baldrick/conversation.ts`,
`storefront/tests/baldrick-conversation.test.ts`.

- [x] Give a conversation memory, so a second turn can depend on the first.

§8 asks for flows and state, which is what separates a character from an FAQ.
The reducer is pure — a state and a message in, a state and a list of replies
out — so the whole of Baldrick's behaviour is testable without a DOM, and B5's
widget is only a way of showing it.

**Quick replies are inputs, not shortcuts.** A button and a typed phrase reach
the same reducer. Anything a button can do, typing can do, which is what keeps
the transcript honest and the tests complete.

**A flow can be abandoned.** Somebody who asks about refunds mid-way through
the discount flow gets an answer about refunds. Insisting on finishing a flow
is what makes a bot feel like a form.

### B4 — What he actually says

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/baldrick.ts`,
`storefront/src/lib/baldrick/intents.ts`,
`storefront/tests/baldrick-copy.test.ts`,
`storefront/tests/legal-consistency.test.ts`.

- [x] Write every line, and guard the three things he must never say.

Copy in `content/`, like every other surface, so it is reviewable without
reading logic. The character is laziness, and `brand.md`'s voice section is where it is
defined rather than here.

`intents.ts` is in this row's files because B2 leaves the list open to whatever
the copy needs; a row that discovered an intent it could not land would be a
blocked row.

**He goes on `legal-consistency.test.ts` as the ninth surface.** An earlier
draft of this plan kept him off it, reasoning that constraint 6 prevents him
saying anything that list watches for. That is backwards, and this project has
learned it twice: C13 found the guard was narrower than the claim, then found
it again one surface later, and its own header says a guard is only as wide as
its list. Inclusion costs nothing while he says nothing legal, and it means the
machine that caught V10's three-position contradiction is the machine watching
him when somebody edits a line in a year. The row bumps the length assertion to
nine and adds one rule: this surface matches none of the confirmation or
withdrawal patterns at all.

Guarded, because these are the failure modes that would actually matter:

- **No price, no total, no figure.** Constraint 5. A test refuses a currency
  symbol or a bare amount anywhere in his lines. That forbids `$0.00`, which is
  the site's signature line — so the decision is stated rather than left as a
  regex side effect: Baldrick says the worth in words, never in figures.
- **No legal claim.** Constraint 6, and the guard bans *claims* rather than
  *words*: no `§`, no "14 days", no "right to withdraw", no "you are entitled",
  no "you can get a refund". The two document titles are allowed verbatim, as
  link text, because naming them is what the constraint requires.
- **No invented figure or population.** §11 and `brand.md` §2 forbid fabricated
  customers, totals, testimonials and social proof, and "eager and confident"
  is exactly the character who wants to say "thousands of satisfied customers".
  No counts, no percentages, no statistics, no other customers.
- **No promise he cannot keep.** He does not offer to pass a message on, look
  an order up, email anybody, or remember anything. Constraint 8.

**The `discount` intent is the sharpest edge and carries a forward liability.**
Anything it says about how codes work describes LD-06 machinery that does not
exist, and §9's mechanics must not leak into copy shipping before them. The
only true things today are that he has a plan and that it is not ready. The day
LD-06 lands, that copy becomes false — so under constraint 9 an LD-06 row must
carry `content/baldrick.ts`. That sentence is written here so LD-06's planner
inherits it rather than rediscovering it.

### B5a — The presenter

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/baldrick/presenter.ts`,
`storefront/tests/baldrick-presenter.test.ts`.

- [x] Decide when each message appears, without a DOM.

B3 made the conversation a pure reducer so the whole of Baldrick's behaviour is
testable without a browser. This is the same argument one layer up: *when* a
message appears is logic, and logic that lives inside a component is logic a
test reaches through a rendering library or not at all.

The presenter takes a list of replies and yields them with delays. It owns the
pause schedule, the indicator's on and off, and the seed threading.

**Reduced motion is read here, and this is the correction the plan needed.**
`globals.css:878` flattens CSS animation and transition; it cannot reach a
`setTimeout`. So the presenter reads
`matchMedia("(prefers-reduced-motion: reduce)")` and collapses every delay to
zero, and the test asserts the schedule rather than asserting the indicator is
CSS. Without this a reader who asked for no motion still waits through the full
theatrical pause.

**Pauses are proportional and capped**, and the numbers are picked against the
rendered thing in B5b rather than guessed here — the way C6 picked the
certificate's spacing by rendering it and looking.

### B5b — The widget

**Repository:** `lousydeal`.
**Files:** `storefront/src/components/baldrick/Baldrick.tsx`,
`storefront/src/app/globals.css`,
`storefront/tests/baldrick-widget.test.ts`.

- [x] Render the conversation, and make it usable by somebody who cannot see it.

The fifth client component in the repository and the first that exists because
somebody wants it rather than because a framework requires it. B1 is what makes
that allowed.

**The entry control is this row's first decision.** Inline section or launcher
and overlay — nobody owned that question before, and every accessibility answer
below depends on it. Inline is what the identity implies: `brand.md` says
document, not bubble, and an overlay is a card by another name. The row states
the answer and what 390px does with it.

**Accessibility is architecture here, not polish.** §23 defers accessibility
work to LD-08, and that is right for contrast and focus rings; it is wrong for
this, because a transcript that is not a live region cannot be made one later
without rebuilding how messages mount. The row decides and asserts:

- the transcript is a live region, polite, so a message arriving is announced
  without interrupting;
- it is announced **once** — the classic defect is a region that re-reads
  everything each time a child is added;
- focus is never taken. A message arriving must not move the caret out of the
  input somebody is typing in;
- the whole exchange is operable from the keyboard: the input, every quick
  reply, and whatever opens and closes him;
- the indicator has accessible text, and under constraint from B1 that text
  does not say "typing", because nobody is.

**It is a document, not a bubble.** No card, no radius, no shadow, no avatar —
§6 keeps all of that. Speaker, then text, in the same ruled register as
everything else.

**The mounted gate**, from the opening decision: `null` on the server and on
first paint, mounted in an effect, so no-script visitors get no dead control.
He therefore arrives after hydration and must shift nothing above him.

**A joke must not be able to unmount the shop.** A render-time exception in
this component reaches `error.tsx` and replaces the purchase order with
`PROCESSING ERROR`. The row decides between a local boundary that drops him
silently and a stated argument for accepting the risk; deciding nothing is the
only wrong answer.

**The standing disclaimer**, constraint 8: always under the input, not waiting
for an intent to match, saying nothing typed here is stored, sent or read by a
person, and pointing correspondence of record at the Imprint.

**Four small decisions the row also carries**, because each is a defect if
left: the input's length bound, in the shape `INSCRIPTION_LIMITS` and
`GIFT_LIMITS` already use; what an empty submit does; that a navigation ends
the conversation, said rather than implied, since a visitor who follows a link
Baldrick gave them loses the exchange that produced it; and that nothing is
persisted, with `browser-storage-disclosure.test.ts` cited as the proof.

### B6 — Where he is, and where he is not

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/layout.tsx` or the routes that mount him,
`storefront/tests/baldrick-reach.test.ts`.

- [x] Put him where he belongs and prove he is absent everywhere else.

**Not the layout.** Mounting him globally would put a client component on the
certificate — a page people screenshot and share, and the one surface LD-02
spent six rows keeping free of anything that is not the document. It would also
put him on the four legal documents, where a character offering opinions beside
a statutory text is the worst idea in this slice.

**Named routes, not "the offer page".** This site has a purchase order at `/`,
a quotation at `/deal/[handle]` and a cart, and "the offer page" is ambiguous
between the first two. The row names the ones he is on.

The negative is proven and the list is wider than the first draft's: no
Baldrick on `/done-deals/`, none on `/legal/`, none in the PDF, none on
`/design/certificate` — the specimen is a certificate too — and **none on
`/checkout`**. A character offering opinions beside the consent checkbox the
site's whole legal position rests on is the second-worst idea in this slice,
after putting him on the legal documents.

**LD-06's adjacency is recorded even though LD-06 is not this slice.** Its code
entry will live at the cart, and a Baldrick reachable only from the home page
would make its flow "get a code, then go and find somewhere to type it". This
row does not build for that, but it writes the constraint down so LD-06 does
not discover it late.

**With scripting off he is not rendered.** Asserted on the served HTML, not
inferred from the source.

### B7 — Gate D, Gate E, and the record

**Repository:** `lousydeal`.
**Files:** the findings, in this document; `docs/working/status.md`.

- [x] Review every row against the contract, then talk to him.

Gate E is executed against a rendered site at 390px and desktop, with scripting
disabled where the surface claims to work without it. LD-02's Gate E found a
defect that made every paid order produce nothing while 1,318 tests passed;
LD-03's found nothing new, which is itself a result. This one is different in
kind: what needs accepting is whether a conversation *reads* like one, and no
assertion covers that.

**So the row holds a real conversation and puts the transcript in the record.**
Ten turns, including a fallback, an abandoned flow, and a question he cannot
answer. A transcript a human can read is the only acceptance this slice has.

## Gate D: what the review found

Executed by running the slice against the contract's Baldrick section, LD-05's
own eleven constraints, and `brand.md` §6 — and, for the intent layer, by
feeding twenty-seven realistic questions through `matchIntent` and reading
where each landed rather than reasoning about the patterns. Nine went somewhere
indefensible.

### 1. He could not say what he was

`are you a real person`, `are you a bot`, `who are you` and `what is baldrick`
all reached the fallback, which answers "I did not understand that. I am not
going to guess." That is the widget declining the one question where leaving a
wrong impression is not a joke. The standing disclaimer under the input already
says nothing reaches a person — but being asked directly and not answering
undoes it, because a visitor reasonably reads a non-answer as evasion.

**Fixed.** An `identity` intent, and a step that answers plainly: "No. I am a
list of sentences somebody typed out in advance." The disclaimer is repeated in
his own words rather than pointed at.

### 2. The one sentence constraint 8 names by name

Constraint 8 says a person typing "my certificate never arrived" must not walk
away believing they have reported it. `it never arrived`, `where is my
certificate` and `I have not received my certificate` all reached the fallback.
The disclaimer covered the belief; nothing covered the answer.

**Fixed.** `support` widened to the words people actually use for a thing that
has not turned up. It points at the Imprint, which is where a person reads.

### 3. A capability the contract names and the slice did not have

The contract's Baldrick section says he "can explain licensing". Five licensing
questions reached the fallback, and no customer-facing surface on this site
mentions a licence at all.

**Fixed**, and in the direction the absence implies: `Nobody has mentioned a
licence to me. What you get is a certificate.` He names *Terms of service* and
stops, which is what his own guards require of him.

### 4. An asymmetry rather than a decision

LD-02 shipped inscriptions and LD-03 shipped gifting. Gifting had an intent;
inscriptions had none, so `can I have it in a different name` reached the
fallback. Nobody decided that — the intent list was written before the older
feature was in view.

**Fixed.** An `inscription` intent, placed after `gift` because "can I put my
friend's name on it" is a gift question with an inscription in it.

### 5. A confident answer to a different question

`\bpay\b` in the `price` pattern sent `what happens after I pay` to `price`,
which replies "The price is written on the page you came from." Wrong, and
worse than the fallback: the fallback admits it did not follow.

**Fixed.** `price` gave up the bare `\bpay\b`; `what_do_i_get` gained "what
happens after". The cost is that payment-method questions now reach the
fallback, which is **a bound this row takes deliberately** — inventing an
intent for shipping, invoices and card types would mean writing answers nobody
has checked, and the fallback names what he does know about.

### 6. Two words nobody uses

`can my company buy these` reached the fallback. The enterprise pattern had
`business plan` and `corporate` and no possessive form.

**Fixed.**

### 7. Rudeness with a different cause

`hello` reached the fallback. Telling somebody who said hello that you did not
understand them is not laziness. A `pleasantry` intent answers it and stops:
"Hello." / "That is the small talk finished." It is anchored to a bare
greeting, so "hello can I get a refund" is still a refund question.

### 8. `brand.md` §6 claimed an amendment that did not happen

B1 amended the animation rule to admit a third animation for Baldrick's pause
indicator. B5b then reached for one, found the blinking block already in
`globals.css` with its `prefers-reduced-motion` exception already argued, and
used it. **Nothing was added, so nothing needed admitting.** B1's sentence was
also wrong on its own terms — it called the indicator "the second animation
this identity has ever admitted" while the line above it named two already.

**Fixed** by withdrawing the amendment rather than renumbering it, marked as
such. The list is shorter than it was, which is the direction it should move.

### 9. §11, in a line this row wrote

A Gate D draft of the `pleasantry` pool read "Hello. You are the first person
to say that today, probably." Hedged, unverifiable, and a claim about other
visitors — §11's subject exactly, written by the row whose job was finding that
class of defect, and passed by four guards written for it.

**Fixed**, and the guard widened in the same commit: the existing patterns all
name a population, and this one named a *rank*, which is the same fabrication
with the population left implied.

### Recorded rather than fixed

- **"Unlock otherwise unavailable products"**, from the contract's Baldrick
  section, has no referent: the only thing §10 has him unlock is Enterprise,
  which §10 itself defers out of V1. His `enterprise` step says there is none,
  which is the truthful state.
- **The contract's example line** — "Certainly. I've applied BALDRICK20. Your
  price is now 20% higher." — is not what he says, and will not be until LD-06
  ships the codes. Saying it today would claim an applied code that does not
  exist and a price change that did not happen, which §11 forbids and which
  outranks an illustration. B4's copy says the code exists and is unfinished.
  This is the same forward liability `content/baldrick.ts` records for LD-06.

## Gate E: the rendered site, and the transcript

Executed against a production build of the storefront, served and driven in
Chromium. Ten turns, from the keyboard only, including a flow, an abandoned
branch, a question he cannot answer, and the sentence constraint 8 names.

### What it found

**Interrupting him threw away what he had already decided to say.** The first
run produced a transcript with three questions in it and no answers beneath
them. That was not a harness artefact in the end but a real defect wearing one:
the next question arrived while he was still speaking, `play`'s cancel stopped
the remaining timers, and the rest of his reply was discarded. A human reading
that transcript sees him ignoring three people.

It is the same defect B5a already forbids in the other direction. The
reduced-motion path collapses the *wait* and not the *content*, and its own test
names the failure — "collapsing the schedule by dropping messages rather than by
dropping the wait". An interruption is the same situation: the lines were chosen
the instant the turn began, and the delay is presentation.

**Fixed.** `play`'s stop now returns the steps that did not run. B5b flushes
them into the transcript when a new turn starts, and discards them on unmount,
where there is nothing left to render into. Confirmed against the running site:
interrupting mid-reply now keeps the sentence that used to vanish.

The harness was wrong too, and separately: it settled on a message count of two
per turn, and some steps say more. It now settles on quiescence.

### The transcript

Ten turns, keyboard only, on the built site.

```text
BALDRICK  I am Baldrick. There is one product and I know most of it.
          Ask me something. I will answer if it is easy.
YOU       are you a real person
BALDRICK  No. I am a short list of answers and a box to type in.
          The line under the box is true. Nothing you say here reaches a person.
YOU       Who wrote the sentences
BALDRICK  Somebody who works here. I did not ask which one.
          They were not paid extra for it, as far as I know.
YOU       what do I get for my money
BALDRICK  A certificate. That is the whole list.
YOU       That is all
BALDRICK  It has a number on it. The number is yours and nobody else gets it.
          I have looked at one. There was nothing on the back either.
YOU       is there any kind of discount
BALDRICK  There is a discount code.
          It is not finished. When it is, it will make your deal worse.
YOU       That is not a discount
BALDRICK  No. It is not.
YOU       can I put my wife's name on it
BALDRICK  You can have something put on it.
          There is a box at the checkout. Keep it short. It is not a big certificate.
YOU       do you deliver to Latvia by hovercraft
BALDRICK  I did not understand that. I am not going to guess.
          I know about the certificate, gifts, refunds and complaints. That is the extent of it.
YOU       it never arrived
BALDRICK  The address is in the Imprint.
          Nothing you type here reaches anybody. I am the last stop.
YOU       actually I want a refund
BALDRICK  That is a matter for a document.
          Refunds and Withdrawal is in the footer. I have not read it, and I am not going to summarise it.
```

**This is the acceptance.** No assertion covers whether a conversation reads
like one, so the operator reads it. What it shows: he answers, he is short, he
declines to summarise a document, he does not pretend to be a person, and the
one he cannot follow he says he cannot follow rather than guessing.

### The rest of the gate

| Checked | Result |
| --- | --- |
| Ten turns, keyboard only — typed messages by `Enter`, quick replies by `Enter` on the button | every turn answered |
| Focus after ten turns | still `baldrick-input`; nothing ever took it |
| Live region, as attributes | `aria-live="polite"`, `aria-relevant="additions"`, `aria-atomic` absent |
| `prefers-reduced-motion: reduce` | both messages present after 51ms; **zero** indicators rendered |
| Same input, two fresh sessions | identical transcripts |
| 390px | 0px horizontal overflow; the ask stacks; edges align with the sheet |
| Scripting off | 0 Baldrick sections, 0 inputs |

## What this slice does not do

| Not done | Belongs to |
| --- | --- |
| The surcharge codes, and anything that changes a cart | LD-06. Baldrick's `discount` intent talks; it issues nothing, because nothing it issued would work yet. |
| Enterprise, and unlocking it | LD-07, deferred out of V1 by §10. The `Enterprise` intent exists and is a joke about a thing that does not exist, which is the only honest version of it. |
| Analytics on what people ask him | §9 wants code-usage tracking and that arrives with LD-06's codes. Counting questions before there is anything to convert would be data collected because it is easy. |
| Storing a conversation, or letting a person read one | Constraint 7. He is not a support queue and must not look like one. |
| Any natural-language processing beyond keywords | §8: "Do not build sophisticated NLP unless actual usage demonstrates a need." There is no usage yet. |
| Progressive enhancement — a no-script fallback transcript | Considered and declined with the operator on 2026-09-08. He gates nothing purchasable, so absence costs a visitor nothing they need. |
| A voice, personality or tone for anything other than Baldrick | `brand.md` §2 owns the site's voice and this slice does not touch it. |

## OWNER MUST FILL

| Value | Needed by | State |
| --- | --- | --- |
| Whether Baldrick's voice section reads as him | B1 | judgement; the row proposes and the operator disposes |
| Whether the transcript in B7 is funny | B7 | the one acceptance no test can give |
| What the indicator says instead of "typing" | B1 | nobody is typing; the honest wording is a voice decision |
