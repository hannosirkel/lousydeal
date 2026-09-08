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

**Execution.** Directly, not through `big-build`. Seven rows, one pull request
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
6. **He never gives legal information.** Not about withdrawal, not about
   refunds, not about data. The four legal documents say those things, LD-02
   and LD-03 spent rows getting them right, and a chatbot paraphrasing them
   would create a fifth surface that says something slightly different. The
   `refund`, `complaint` and `support` intents point at the documents and at a
   real address; they do not summarise.
7. **He is not a support queue.** Nothing he is told is stored, sent, or read
   by a person. §8 makes him a character and a commerce mechanic; a widget that
   looked like it took messages would be collecting them into a void, which is
   worse than not offering one.
8. **A row that falsifies a tracked document carries it.** LD-02's constraint 9.
9. **No emoji, no exclamation mark**, in his voice as everywhere else.
   `brand.md` §6 is not amended on that point and this slice does not ask.

## Current repository facts

Measured against `origin/main` at `62b02a5`, 2026-09-08.

| Fact | Where | Consequence for this slice |
| --- | --- | --- |
| Four client components exist | `error.tsx`, `global-error.tsx`, `checkout/page.tsx`, `checkout/PaymentForm.tsx` | Baldrick is the fifth and the first that is neither a framework requirement nor a payment form. B1 is where that is authorised. |
| The storefront has six runtime dependencies | `storefront/package.json` | Baldrick adds none. A chat library would bring a design system this identity forbids and a bundle for a character who says forty sentences. |
| `prefers-reduced-motion` is already honoured globally | `globals.css:878` | Typing indicators and pauses inherit it for free. B5 asserts that rather than reimplementing it. |
| One animation already exists | `globals.css:866`, `cursor-blink` | The typing indicator is the second, and `brand.md` §6 names both after B1. |
| `third-party-disclosure.test.ts` scans the source for external hosts | `storefront/tests/` | Constraint 2 means this guard keeps passing unchanged, which is the cheapest proof that Baldrick reaches nothing. |
| The layout renders `children` and a footer on every route | `storefront/src/app/layout.tsx:99` | Where Baldrick is mounted is B6's decision, and mounting him in the layout would put a client component on every document including the certificate. |
| Nothing in the repository stores a conversation | — | Constraint 7. State lives in the component for the length of a visit and is not persisted, which is also why no privacy-policy row appears in this slice. |
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
| 5 | Messages arrive one at a time with a typing indicator, and the whole thing respects reduced motion | B5 |
| 6 | With scripting off, no Baldrick and no dead control | B5, B6 |
| 7 | He quotes no price, gives no legal information, and takes no message | B4, B6 |
| 8 | He is reachable from where it makes sense and absent from where it does not | B6 |
| 9 | Gate D on every row, Gate E on the rendered widget, and the record | B7 |

## Rows

Seven. Each names its files and its one checkbox.

### B0 — This plan

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-05-baldrick.md`, `docs/working/status.md`.

- [ ] Land the plan and move the resume point to it.

### B1 — The identity admits him

**Repository:** `lousydeal`.
**Files:** `docs/current/brand.md`, `storefront/tests/brand-contract.test.ts` if
one exists, otherwise the guard that reads `brand.md`.

- [ ] Write Baldrick's voice section and the two §6 amendments, as amendments.

**First, because nothing else is authorised until it lands.** §6 is written as
"a single list, so a later surface does not have to re-derive it", and a row
that added a client component while that list forbade one would be deriving its
own permission.

Two amendments and no more: a fourth client-side exception, and a second
animation. Everything else in §6 stands — no icon, no mascot, no card, no
border radius, no emoji, no exclamation mark. **Baldrick has no face**, which
is a constraint the voice section should state positively rather than leave to
be discovered: he is a name and a column of text.

The voice section is what LD-09 deferred. It has to give a writer enough to
write forty lines that sound like one person, and it has to say what he never
says — the price, the law, and anything he cannot deliver.

### B2 — Recognition, and the pools

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/baldrick/intents.ts`,
`storefront/src/lib/baldrick/pool.ts`, `storefront/tests/baldrick-intents.test.ts`.

- [ ] Match what a visitor typed to one of §8's intents, deterministically.

Keyword and phrase matching, as §8 says, and nothing cleverer. The ten intents
it lists — discount, Enterprise, support, refund, complaint, gift, what do I
get, price, subscription, fallback — plus whatever the copy row finds it needs.

**The pool is seeded, not random.** `Math.random()` would make a transcript
irreproducible and a test either flaky or blind to which line it got. The seed
is derived from the conversation so far, so the same exchange replays
identically and a bug reported as a transcript can be reproduced from it.

**Ambiguity resolves in a stated order, and the order is a decision.** A
message matching both `refund` and `complaint` has to go somewhere; the row
picks and says why rather than letting declaration order decide silently.

### B3 — Flows, state, and quick replies

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/baldrick/conversation.ts`,
`storefront/tests/baldrick-conversation.test.ts`.

- [ ] Give a conversation memory, so a second turn can depend on the first.

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
`storefront/tests/baldrick-copy.test.ts`.

- [ ] Write every line, and guard the three things he must never say.

Copy in `content/`, like every other surface, so it is reviewable without
reading logic. The character is Blackadder's Baldrick: eager, confident, and
wrong in a way that is somehow still on-brand for a shop selling nothing.

Guarded, because these are the failure modes that would actually matter:

- **No price, no total, no figure.** Constraint 5. A test refuses a currency
  symbol or a bare amount anywhere in his lines.
- **No legal information.** Constraint 6. No `§`, no "14 days", no "withdrawal",
  no "refund policy" paraphrase — the intents that touch these point at the
  documents by name and stop.
- **No promise he cannot keep.** He does not offer to pass a message on, look
  an order up, email anybody, or remember anything. Constraint 7.

### B5 — The widget

**Repository:** `lousydeal`.
**Files:** `storefront/src/components/baldrick/Baldrick.tsx`,
`storefront/src/app/globals.css`,
`storefront/tests/baldrick-widget.test.ts`.

- [ ] Render the conversation, one message at a time, with a typing indicator.

The fifth client component in the repository and the first that exists because
somebody wants it rather than because a framework requires it. B1 is what makes
that allowed.

**Pauses are proportional and capped.** A pause long enough to feel real and
short enough not to feel broken; the row picks the numbers against the rendered
thing rather than in advance, the way C6 picked the certificate's spacing.

**Reduced motion is inherited, not reimplemented.** `globals.css:878` already
flattens every animation and transition; the typing indicator must be built so
that rule reaches it, and a test asserts the indicator is CSS animation rather
than a JavaScript timer that would ignore the preference.

**It is a document, not a bubble.** No card, no radius, no shadow, no avatar —
§6 keeps all of that. Speaker, then text, in the same ruled register as
everything else.

### B6 — Where he is, and where he is not

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/layout.tsx` or the routes that mount him,
`storefront/tests/baldrick-reach.test.ts`.

- [ ] Put him where he belongs and prove he is absent everywhere else.

**Not the layout.** Mounting him globally would put a client component on the
certificate — a page people screenshot and share, and the one surface LD-02
spent six rows keeping free of anything that is not the document. It would also
put him on the four legal documents, where a character offering opinions beside
a statutory text is the worst idea in this slice.

The row decides where he *is* — the offer page is the obvious candidate — and
proves the negative: no Baldrick on `/done-deals/`, none on `/legal/`, none in
the PDF, and no client component reaching those routes that was not there
before.

**With scripting off he is not rendered.** Asserted on the served HTML, not
inferred from the source.

### B7 — Gate D, Gate E, and the record

**Repository:** `lousydeal`.
**Files:** the findings, in this document; `docs/working/status.md`.

- [ ] Review every row against the contract, then talk to him.

Gate E is executed against a rendered site at 390px and desktop, with scripting
disabled where the surface claims to work without it. LD-02's Gate E found a
defect that made every paid order produce nothing while 1,318 tests passed;
LD-03's found nothing new, which is itself a result. This one is different in
kind: what needs accepting is whether a conversation *reads* like one, and no
assertion covers that.

**So the row holds a real conversation and puts the transcript in the record.**
Ten turns, including a fallback, an abandoned flow, and a question he cannot
answer. A transcript a human can read is the only acceptance this slice has.

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
