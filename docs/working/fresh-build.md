# Build LousyDeal.com

Build **LousyDeal.com**, a novelty ecommerce site where customers knowingly pay for a deliberately poor deal and receive an absurdly polished certificate documenting it.

This is a long-lived small product, not a throwaway landing page. It should be simple initially but structurally easy to extend with future products, jokes, subscriptions, merch, social mechanics, and other ideas.

Do **not** treat this as one giant implementation task.

The previous experience with a small webshop built through one broad umbrella task produced oversized PRs, excessive comments, slow execution, mediocre design/copy, and substantial correction work. This initiative must explicitly avoid those failure modes.

---

## 1. Operating model

Act primarily as an **initiative coordinator**.

Your responsibilities are to:

1. read the governance in §2, and get `lousydeal` catalogued;
2. inspect the existing Plepic Games / Medusa implementation for reusable patterns;
3. understand and refine the Lousy Deal product;
4. separate product, brand, copy, visual design, architecture, and implementation;
5. break implementation into small independently reviewable slices;
6. delegate or execute each slice with fresh focused context;
7. review every slice before proceeding;
8. visually inspect user-facing work in a running browser;
9. maintain durable initiative state;
10. deliver a polished working product.

The initiative coordinator should make little or no product-code changes directly where agent delegation is available.

Do not create one giant implementation prompt or PR.

---

## 2. Governance first

Governance is not something to go looking for. It is
[`hannosirkel/architecture`](https://github.com/hannosirkel/architecture), and
it governs this repository because `lousydeal` appears in its
`universe/repositories.yaml`. Membership does not depend on any file here.

Read these before designing or implementing anything:

| Standard | Governs |
| --- | --- |
| `standards/planning.md` | how a plan row is sized, and the pull-request size gate |
| `standards/agent-operation.md` | worktrees, branches, multi-agent safety, delegation, model tiers |
| `standards/code-quality.md` | the gate, the coach, testing, review cutoff |
| `standards/security.md` | secrets, public-content policy, workflow hardening |
| `standards/repository-contract.md` | required files, profiles, checks |
| `standards/documentation.md` | `docs/` layout, prose budget, the `AGENTS.md` budget |
| `standards/work-routing.md` | where a change starts, and where a plan belongs |
| `standards/gitops-and-deployment.md` | promotion by digest, rollback, the sanctioned secrets path |

This repository's own generated `AGENTS.md` links each of them. Read a standard
before changing something it governs.

Then:

* inspect the current Plepic Games storefront/backend implementation;
* inspect how Plepic currently handles:

  * Medusa;
  * Next.js/storefront;
  * Stripe;
  * PostgreSQL;
  * email;
  * deployment;
  * environments;
  * secrets;
  * analytics;
  * legal pages;
  * taxation;
  * CI/CD;
  * observability.

Produce a short **reuse assessment** identifying:

* patterns that should be reused;
* code that can safely be extracted/shared;
* code that should initially be copied/adapted instead;
* Plepic-specific behavior that must not leak into Lousy Deal.

Prefer proven existing patterns over inventing new infrastructure.

However:

**Lousy Deal must be a separate store/application deployment.**

At minimum it should have its own:

* Medusa instance;
* database/schema as appropriate;
* configuration;
* secrets;
* products;
* customer/order data;
* domain;
* deployment lifecycle.

Do not couple Lousy Deal availability or product behavior to Plepic Games.

---

## 2a. Visibility, secrets, and what may be published

**This repository is public**, and `public_safe_required: true`. It must be safe
to publish on every commit, not cleaned up before a launch.

That buys the two controls the previous build lacked: a branch-protection
ruleset — the GitHub plan offers none on a private repository — and GitHub push
protection, which catches a leaked credential *before* it lands rather than
after it is in history.

It also imposes a review burden. `standards/security.md` requires a decision
before committing an internal hostname or private IP range, a live resource
identifier, a real person's name or contact details, or the shape of an internal
process.

**Never commit a secret.** Not a Stripe key, a webhook signing secret, a Printful
token, a database password, or a rendered Kubernetes Secret. Credentials live in
OpenBao or the ignored `.keys/` directory of the Orange checkout, and reach the
runtime through the sanctioned External Secrets path. A private repository would
not have changed this rule; private is not secret.

Nothing that differs between test and live is ever baked into a built artifact.
Next.js inlines every `NEXT_PUBLIC_*` value at build time, so no per-environment
value may be one: read such values server-side at runtime and hand the browser a
single serialized runtime-config object. `plepic` already does this.

**Baldrick is public, and that is a product decision.** The repository publishes
his flows, his keyword matching, and every scripted joke — permanently, not only
before launch. The premise is the product and jokes are cheap to add, so this is
accepted.

The one exception: if an unlock is meant to be genuinely discoverable — Baldrick
"unlocks otherwise unavailable products" — then those **unlock keywords are
runtime configuration, read server-side, never committed.** That is one secret
handled like every other, not an architecture. Everything else about Baldrick
stays in the repository. With Enterprise deferred, V1 may have no such unlock at
all; if it does not, this exception is unused and no secret is needed.

---

## 3. Product premise

The fundamental brand/product rule is:

> **Every feature should give the customer another entertaining opportunity to make their deal worse.**

The product is deliberately absurd, but the implementation and presentation must be highly competent.

The joke comes from the contrast between:

* polished corporate presentation;
* serious ecommerce machinery;
* premium-looking certificates;
* enterprise-software language;

and the fact that the customer receives almost no economic value.

Do not make the site look intentionally badly designed.

Do not use a generic meme-site aesthetic.

Do not use generic AI-startup gradients, stock imagery, random AI-slop graphics, emoji overload, or conventional SaaS marketing clichés unless used deliberately as parody.

The company itself should generally behave as if all of this is perfectly reasonable.

---

## 4. V1 product scope

### 4.1 Core deals

Provide these products:

#### Lousy Deal — $5

Customer receives:

* a unique numbered Lousy Deal;
* a polished digital certificate;
* a permanent public certificate page unless otherwise specified.

#### Lousy Deal Plus — $10

Essentially the same economic value as the $5 product.

Differences should be mostly:

* Plus branding;
* more prestigious certificate treatment;
* stronger implication that paying more was a worse decision.

#### Lousy Deal Pro — $25

Again essentially the same underlying economic value.

Provide:

* Pro branding;
* more elaborate certificate presentation;
* professional-grade poor-judgment language.

The humor depends on higher tiers providing little or no meaningful additional value.

---

## 5. Certificates

Certificates are the primary real digital product and should look **surprisingly good**.

### What is public, and what is not

**The name on the order is never public.** Billing identity is order data, not
certificate content, and it appears nowhere on the public page, the share card,
the PDF, or any counter.

What appears instead is what the buyer chose to type. Two optional fields, both
entered at checkout, both shown to the buyer as public before they pay:

| Field | Limit | Purpose |
| --- | --- | --- |
| display name | short | who the certificate names, if anyone |
| dedication | 120 characters | the shareable line |

Together they are the **inscription** — the term the rest of this document uses
for whatever the buyer chose to make public.

Both are optional, and an empty pair must render well — most buyers will leave
both blank, and the certificate has to look deliberate rather than unfinished
when they do.

**Sanitisation is a build requirement, not a moderation policy.** Reject or
strip, at entry and again at render:

* markup, scripts, and anything that could execute or style;
* URLs and bare domain names;
* email addresses;
* phone numbers.

That is a mechanical filter against the public page becoming a free billboard or
a phishing surface. It is not a judgement about content.

**Moderation policy is out of scope** and is decided at the legal gate. Build
for it anyway: an operator must be able to further sanitise, hide, or blank
either field later — without a schema change, without a new serial, and without
reissuing the certificate. That means the rendered certificate is always
derived, never stored as the only copy.

Each certificate should contain suitable information such as:

* the display name and dedication, when present — never the order's billing name;
* tier;
* amount paid;
* unique serial/deal number;
* issuance date;
* public URL;
* appropriate Lousy Deal wording;
* tier badge;
* optional QR code;
* suitable mock corporate signature/seal.

Example tone:

> CERTIFICATE OF LOUSY DEAL
>
> This certifies that
> **Jane Example**, or the bearer where no name was given,
>
> voluntarily exchanged
> **$25.00**
>
> for a **Lousy Deal Pro**, despite substantially better uses for the money
> almost certainly existing.
>
> *"worth every cent, regrettably"* — the dedication, when present

Do not copy this literally without considering the final approved voice.

Certificates should be:

* viewable on the web, at a clean public URL;
* shareable, with share links and a social card;
* **downloadable as a PDF**;
* deterministic and regenerable from stored deal data.

### The PDF, its renderer, and its URLs

The certificate page carries share links and a **Download PDF** action.

**The PDF is vector-rendered**, not produced by driving a headless browser. It
is a second layout, and it is allowed to drift from the HTML certificate: the
page and the document are each free to be right for their own medium. Two
layouts is the accepted cost of not shipping a browser in the backend image.

**A layout is versioned, and an issued certificate keeps the layout it was
issued under.** When the design changes, new deals get the new layout and every
existing deal still renders exactly as its holder first saw it. The deal stores
its layout version; a retired layout stays in the codebase and stays tested.
Redesigning is additive. It never restyles a certificate somebody already owns.

**No object storage.** The PDF is rendered by the application and served by the
application. There is no bucket, no external storage credential, and no storage
outage that can take a certificate offline. Cache it if it earns the cache, but
treat the cache as disposable and the deal record as the source of truth.

### URLs

```text
lousydeal.com/done-deals/{slug}
lousydeal.com/done-deals/{slug}/certificate.pdf
```

* **`{slug}` is opaque and random.** It is not the serial, not sequential, and
  not guessable. A public URL nobody can enumerate is the entire reason it
  exists.
* **The serial is a sequential display number** — `Lousy Deal #18,421` — and it
  appears on the certificate, in the share card, and in the counter. It never
  appears in a URL.
* The two are independent. The slug addresses the deal; the serial names it.
  Neither is derivable from the other.
* Sequential serials publish the true order count. Do not start the sequence at
  an inflated offset to look busier — §11 forbids fabricated transaction totals,
  and a serial that overstates volume is exactly that. Deal #1 is fine.

---

## 6. Gift purchases

A customer must be able to purchase a Lousy Deal as a gift.

Support:

* recipient name;
* recipient email;
* optional sender name;
* optional message;
* immediate delivery initially.

Scheduled delivery can be deferred unless it is exceptionally cheap to implement cleanly.

The recipient receives the certificate.

The copy should reinforce the premise, e.g. the conceptual idea:

> Someone spent $10 so you wouldn't have to.

Do not use this exact wording blindly; the copy phase owns final text.

Gift purchases should require no account registration.

---

## 7. Merch

Integrate **Printful from V1**.

Initial merch catalog must remain deliberately tiny:

1. one T-shirt design;
2. one mug design;
3. one sticker design.

Do not build a broad merchandise catalog.

The merch exists primarily as a punchline/upsell.

The preferred UX concept is:

> **Would you like to make your deal worse?**

Merch should use the proper Medusa product/order/fulfillment model rather than arbitrary webhook hacks.

Implement Printful through the current Medusa extension/provider mechanism appropriate to the installed Medusa version.

Do not adopt an abandoned community integration merely because one exists.

Prefer a small maintainable in-repo provider/module initially. Extract it into a reusable package only if real reuse emerges.

Handle:

* product mapping;
* variants;
* shipping address;
* fulfillment creation;
* Printful order creation;
* status synchronization as reasonably required;
* error handling/idempotency;
* test/live separation.

---

## 8. Baldrick

Create **Baldrick**, the site's deterministic sales/support chatbot.

Baldrick is a character and commerce mechanic, not merely an FAQ widget.

No LLM backend.

Use:

* predefined conversational flows;
* state;
* keyword/phrase matching where useful;
* buttons/quick replies;
* deterministic/randomized response pools;
* typing indicators;
* realistic pauses;
* multi-message replies.

Baldrick should appear sufficiently conversational while remaining completely predictable and cheap to operate.

Possible intents include:

* discount;
* Enterprise;
* support;
* refund;
* complaint;
* gift;
* what do I get?;
* price;
* subscription;
* fallback.

Limited comprehension is acceptable and can be part of the character.

Do not build sophisticated NLP unless actual usage demonstrates a need.

---

## 9. Baldrick discount mechanics

Baldrick can issue apparent “discount” codes that make the customer's deal worse.

Examples of mechanics:

* `SAVE10` → +10%;
* `BALDRICK20` → +20%;
* `FREE` → adds an absurd convenience fee;
* a VIP code → unlocks a more expensive product;
* `BLACKFRIDAY` → 0% off.

These are examples, not required final codes.

Important:

* never deceive the customer about the final payable price;
* the modified price must be obvious before checkout;
* humor must come from knowingly accepting a worse deal;
* payment/legal UX must remain legitimate.

Track code usage so later analytics can answer questions such as:

* how many customers asked Baldrick for a discount;
* how many accepted a worse price;
* which codes convert.

### How a surcharge is actually built

The customer-facing interaction is a genuine "enter a discount code, watch a
surcharge appear" moment. What the customer sees:

```text
Subtotal                           $5.00
Discount (BALDRICK20)              +$1.00
                                  ------
Total                              $6.00
```

Their model of the cart:

```text
cart
|- products
|- discounts
|- surcharge  +$1
`- total      $6
```

The Medusa implementation:

```text
cart
|- Lousy Deal $5
`- internal custom-priced fee item $1
```

The fee is an ordinary custom-priced cart line item. That is a supported Medusa
customization path, and it is what makes totals, tax, checkout and the resulting
order all agree on $6 without a parallel pricing engine beside them.

Give the item metadata:

```ts
{
  internal_type: "baldrick_surcharge",
  code: "BALDRICK20",
  base_amount: 500,
  percentage: 20,
}
```

The storefront rule is one line: an item whose `internal_type` is
`baldrick_surcharge` renders as a cart adjustment, never as merchandise. The
same metadata carries the analytics — which code, on what base, at what rate —
without a second table to keep in step.

**Do not build this on Medusa promotions.** A promotion reduces a price. It
cannot raise one.

---

## 10. Enterprise — deferred, not in V1

**Enterprise is out of scope for the first version.** No subscription, no
recurring billing, no entitlement, no expiry. It is the hardest phase — real
lifecycle state, auto-renewal disclosure, and revoking something a customer paid
for — and none of it is needed to prove the premise.

The design below is retained so V1 does not architecturally block it (§26).
Build nothing from this section. In particular, V1 ships **no subscription
machinery and no entitlement model**, and the domain model keeps a certificate's
validity unconditional.

Enterprise must not simply appear alongside normal pricing.

The customer should discover/unlock it through Baldrick.

Concept:

#### Lousy Deal Enterprise

* annual subscription/license;
* one-year certificate entitlement;
* one year of “support”;
* support wording may include caveats such as Baldrick being available/interested;
* Enterprise certificate remains publicly available only while the subscription/license is active;
* when entitlement expires, the public page becomes an appropriately branded expired-license page;
* renewal restores entitlement.

The Enterprise experience should parody B2B SaaS licensing.

Possible language/themes:

* Enterprise-grade disappointment;
* dedicated account neglect;
* priority indifference;
* support for up to zero users;
* certificate licensing;
* renewal management.

Do not make the actual subscription/cancellation flow deceptive or difficult.

Use Stripe/Medusa recurring-payment capabilities appropriate to the current stack rather than inventing a subscription engine.

---

## 11. Public counters and shareability

Add lightweight viral/shareable mechanics where they remain simple.

Strong candidates for V1:

* total number of lousy deals;
* total nominal amount spent on lousy deals;
* latest deal number;
* share buttons;
* shareable certificate image;
* simple deal milestones.

Do not fabricate customers, transaction totals, testimonials, or reviews.

Demo/test data must never appear as real customer activity in production.

Real testimonials may be added later with proper customer consent.

Marketing jokes must not masquerade as actual customer reviews.

---

## 12. Accounts

Do **not** require normal customers to create accounts.

Default flow:

```text
landing page
→ choose lousy deal
→ optional gift information
→ optional merch
→ checkout
→ payment
→ certificate creation
→ email
→ public certificate page
```

Use email/order lookup or another low-friction mechanism if customers need later access.

V1 needs no account system at all: Enterprise, which was the only thing that
would have required identity handling, is deferred.

YAGNI.

---

## 13. Brand and copy phase

Do not let implementation agents invent the brand as they code.

Before frontend implementation, produce a compact **brand/voice specification** covering at least:

* brand personality;
* Baldrick personality;
* humor rules;
* visual tone;
* phrases/styles to avoid;
* treatment of customers;
* degree of deadpan seriousness;
* relationship between polished presentation and ridiculous proposition.

The intended direction is approximately:

* deadpan;
* polished;
* confident;
* corporate;
* understated;
* absurd through substance rather than noisy presentation;
* never desperate for laughs;
* never generic meme copy.

Then produce the actual V1 copy separately:

* home/landing page;
* tier descriptions;
* checkout-supporting copy;
* gift flow;
* certificate wording;
* Baldrick key flows;
* merch upsells;
* transactional emails;
* 404/error states where appropriate.

Copy must be reviewed as copy.

Do not bury copy review inside a frontend PR.

---

## 14. Visual design phase

Before implementing the main storefront, create actual visual direction.

Design at minimum:

* desktop home page;
* mobile home page;
* tier/pricing section;
* Baldrick chat;
* certificate page;
* gift flow;
* post-purchase upsell.

Use actual proposed copy rather than lorem ipsum.

Present 2–3 genuinely distinct directions if the visual language is not yet obvious.

Get the selected direction approved before production frontend implementation.

After implementation, compare the actual rendered site against the approved visual direction.

A passing unit-test suite does not constitute visual acceptance.

---

## 15. Technical direction

Preferred baseline:

* Medusa;
* Next.js / TypeScript;
* PostgreSQL;
* Stripe;
* Printful;
* SMTP for transactional email, in the `plepic` shape: a Medusa notification
  provider over nodemailer, with credentials supplied per environment.
  **Brevo is the newsletter tool only.** It is not the transactional path, and
  the two are not to be merged.

Reuse Plepic conventions where they are generic and proven.

### Deployment

Decided: **the Orange cluster, the same shape as `plepic` and `servitium`, with
a test and a live environment.** `standards/gitops-and-deployment.md` governs
it, and this repository declares it as `extra_standards`.

```text
lousydeal CI builds and verifies an immutable image
  └─ an approved promotion writes its digest into deploys
       └─ Argo CD reconciles deploys
            └─ Orange runtime
```

| Stage | Owner |
| --- | --- |
| Source, tests, image build | `lousydeal` |
| Deployable desired state, one app root per environment | `deploys/lousydeal/` |
| Argo CD `Application` objects and cluster bootstrap | `orange` |
| Live private values | `orange-inventory` |

Rules that bite:

* **Promote by digest, never by tag.** A tag moves; a digest does not. Roll back
  by promoting a known-good digest, never by editing live cluster state.
* A live promotion is merge-promoted; a test promotion is label-promoted and its
  overlay is replaceable.
* **Merging is an effect gate here.** Under the Servitium pattern the merge *is*
  the deployment, so it takes its own approval worded as a deployment, never
  bundled with the review approval. A label, comment or workflow dispatch that
  triggers a build or promotion is an effect gate on the same footing.
* A pull request that *adds* a `push`-triggered workflow fires it on merge. On
  the previous build a promotion workflow ran three seconds after the merge that
  introduced it, against an explicit claim that it could not.
* Every manifest change renders and schema-checks before it can reach Argo CD:
  `kubectl kustomize <overlay> | kubeconform -strict -summary`.
* `deploys` is public and must never carry a secret value.
* Adding a promotion path to `deploys` needs the promoting workflow registered
  as a bypass actor on its ruleset. Adding `required_status_checks` without that
  silently stopped every promotion for two hours and ten builds once already.

### Environments and domains

The domain exists. Two environments, the `plepic`/`servitium` shape:

| Environment | Host | Access |
| --- | --- | --- |
| live | `lousydeal.com`, with `www.lousydeal.com` redirecting to it | public |
| test | `test.lousydeal.com` | Cloudflare Access, Google identity |

Rules:

* **`www` is a redirect, not a second origin.** One canonical host, so
  certificate URLs, share cards and analytics do not split across two.
  Canonicalise at the edge; `plepic` already had to fix exactly this.
* **The test environment is gated at the edge by Cloudflare Access**, not by
  application-level auth and not by robots directives. A short Access session,
  not the 24-hour default the previous build left on two applications.
* Test runs in **Stripe test mode** and against a Printful sandbox. A live key
  never reaches test, and test and live credentials are never written in one
  step or one effect gate.
* **Test data must not leak into public statistics** — the global counter, deal
  serials and any leaderboard are live-only.
* No administrative path is reachable from a public hostname, in any encoding.
* DNS publication, the Access policy, and each credential write are individual
  effect gates, approved one at a time immediately before execution, each with
  its own stated rollback.

**The cutover plan does not live here.** Domain, DNS, live Stripe keys and the
point of no return name live hosts and identities, so under
`standards/work-routing.md` that plan goes to the private `orange-inventory` at
`docs/working/`.

### Redis

Decided: **Redis is in.** Medusa 2.x wants it for the event bus and the workflow
engine outside development, and `plepic` already runs it that way — a backend
that refuses to start rather than starting half-wired, plus a separate worker
mode. Copy that shape, and copy its lessons with it:

* **Fail closed on a missing or wrong Redis.** `plepic` runs a preflight that
  refuses, rather than letting Medusa fall back to an in-memory bus that
  silently drops events the moment there is a second replica.
* **Keep the password out of the connection string**, in the client options
  instead, so no connection *string* can carry it into a log.
* A wrong `REDIS_PASSWORD` is a credential-rotation event, not a restart.
  Restarting a pod does not un-write a password that has already been logged.
* Read `plepic/README.md` on the workflow-engine migration before the first
  migration runs. It names a query to run first.

Do not introduce:

* microservices without a concrete requirement;
* a CMS just to edit a tiny amount of marketing copy;
* an LLM backend for Baldrick;
* unnecessary event buses;
* generic enterprise abstractions;
* speculative plugin systems.

Keep the system boring.

---

## 16. Domain model

Use Medusa as the source of truth for normal commerce concepts:

* product;
* cart;
* order;
* payment;
* fulfillment;
* customer/address where applicable;
* subscription/payment integration as appropriate.

Create a small Lousy Deal domain/module for only Lousy-Deal-specific concepts.

Likely concepts include:

```text
LousyDeal
- id
- order_id
- serial_number        sequential, displayed, never in a URL
- public_slug          opaque, random, addresses the deal
- tier
- amount_paid
- display_name         optional, sanitised, public
- dedication           optional, <= 120 characters, sanitised, public
- layout_version       frozen at issuance
- gift metadata
- status
- issued_at
```

Exact schema must be designed against the installed Medusa version and existing
project conventions. The customer's billing name lives with the order, never
with the deal. There is no stored PDF reference: the document is derived from
these fields and their layout version, every time it is asked for.

`expires_at` is deliberately absent. It existed for Enterprise entitlement, and
Enterprise is out of V1 (§10). Adding it later is a migration, not a redesign.

Do not duplicate complete order/payment state into custom tables.

Ensure certificate issuance is idempotent.

Stripe/webhook retries must not generate duplicate certificates, Printful orders, or gifts.

---

## 17. Implementation decomposition

Do not implement V1 as a single plan.

Use independently testable slices approximately like:

### LD-00 — Governance foundation

Everything here lands **before the first line of product code**. On the previous
build this work was retrofitted two days after cutover, and until then `shell`
was a declared language with no linter in CI, three Actions checkouts persisted
credentials across 71 pull requests, and there was no link checker, no markdown
gate, no dependency automation and no `docs/` layout.

Deliver:

* the `lousydeal` entry in `architecture`'s `universe/repositories.yaml` —
  `profile: application-public`, `declared_visibility: public`,
  `public_safe_required: true`, `extra_standards: [gitops-and-deployment.md]`,
  `languages: []` and `lifecycle: registered-not-implemented` until there is
  code to gate;
* the repository, with `README.md`, `AGENTS.md` and `CLAUDE.md` pushed as the
  initial commit under the empty-repository exception in
  `standards/agent-operation.md` — the one case the audit whitelists;
* `tooling/universe sync-baseline lousydeal`, then `tooling/universe audit
  lousydeal` clean;
* `docs/current/`, `docs/decisions/` and `docs/issues/`, each created only once
  it has content — an empty one fails conformance;
* the branch-protection ruleset: `deletion`, `non_fast_forward`,
  `pull_request`, and **`required_status_checks` from the first commit**. Its
  absence is what let three pull requests merge red in one afternoon on the
  previous build;
* one canonical validation command that **is** what CI runs. The previous build
  split `scripts/validate` from the workflow, and the gap is where red reached
  `main`;
* `renovate.json` extending `local>hannosirkel/architecture//templates/default`;
* gitleaks in CI over full history (`fetch-depth: 0`), pinned by version and
  SHA256;
* every Action pinned to a full commit SHA, a top-level
  `permissions: contents: read`, `persist-credentials: false`, and `zizmor` on
  changed workflows;
* `.markdownlint-cli2.jsonc` and `lychee.toml`, with today's findings baselined
  once and a stated reason. Tables and pinned digests cannot wrap, so MD013 on
  them is baselined rather than fought — `architecture` and `plepic` both do
  this;
* a release-failure notifier. `plepic` has none, so when its promotion broke it
  failed four times in silence;
* registration of this plan in `architecture`'s `notable_local_work`, by link.

This slice is ordinary work, not an orchestrated build. Adding a repository is
three commands and took under ten minutes for `portfolio-bot`, README included.

**Operator work running in parallel**, none of it agent-executable, and each a
blocker for the slice that first needs it:

| Item | Needed by |
| --- | --- |
| Stripe account, test keys | LD-01 |
| Stripe live keys | the publication gate, not before |
| Printful account and sandbox | LD-04 |
| Cloudflare Access policy for `test.lousydeal.com` | LD-01 deploy |
| DNS for `lousydeal.com` and the `www` redirect | LD-01 deploy (test), publication (live) |

The domain already exists. Record which of these the operator holds before the
first slice starts; an account nobody holds turns every row that depends on it
from joint work into a blocked row.

### LD-01 — Foundation

Deliver:

* new independent Lousy Deal application/store;
* reused generic stack patterns;
* basic Medusa configuration;
* Stripe;
* `$5`, `$10`, `$25` products;
* basic successful checkout;
* deployment to development/test environment.

No certificates, Printful, or Baldrick yet unless absolutely required by the foundation.

### LD-02 — Certificates

Deliver:

* deal issuance;
* unique serial;
* the checkout inscription field, and its storage as deal data;
* public certificate page under `/done-deals/{slug}`, showing the inscription
  and never the customer's billing name;
* certificate rendering;
* vector PDF generation, served by the application, with the layout version
  frozen onto the deal at issuance;
* share links and social card;
* email delivery;
* idempotency under webhook retry: a retried webhook never mints a second
  serial, slug or deal.

### LD-03 — Gifting

Deliver complete gift purchase flow.

### LD-04 — Printful + initial merch

Deliver exactly:

* shirt;
* mug;
* sticker;
* Printful fulfillment.

### LD-05 — Baldrick

Deliver deterministic conversational UI and core intents.

### LD-06 — Worse discounts

Deliver Baldrick-issued price-increasing codes and tracking.

### LD-07 — Enterprise (deferred)

**Not in V1.** Removed from scope by operator decision. Kept as a numbered slot
so later references stay stable and the decision stays visible. See §10 and §26.

### LD-08 — Launch polish

Deliver:

* final responsive review;
* accessibility;
* SEO;
* metadata;
* analytics;
* performance;
* error states;
* final copy review;
* visual review;
* production readiness.

Adjust boundaries if the actual existing architecture suggests a clearly better decomposition, but preserve the principle:

**one independently understandable responsibility per slice.**

---

## 18. Task and PR sizing

Within each LD slice, decompose further where useful.

Prefer tasks/PRs that:

* have one principal responsibility;
* can be independently tested;
* can be independently rejected by a reviewer;
* can be understood without reading a massive diff.

`standards/planning.md` owns the rule. It is a **gate, not a signal**:

| Bound | Trips the gate at |
| --- | --- |
| Changed lines | more than 800 |
| Files | more than 10 |

Aim at 400–800 lines. Generated lockfiles, migrations and snapshots are
excluded from both counts, and their paths and line count are named in the
pull-request body.

**Over either bound, the pull request carries a named override** stating who
approved it and why the work could not be split. The operator gives it; the
author does not approve their own. No check counts lines, so a reviewer refuses
an over-bound pull request that carries no override.

The earlier wording here — "these are not hard limits" — is the exact sentence
that failed on the previous build. It read as permission. Thirty of forty-four
pull requests exceeded the bound, seventeen passed 2,000 lines, and the largest
carried 8,047 hand-written lines across 70 files. The orchestrator recorded the
violation and shipped anyway.

Do not produce a “complete Lousy Deal implementation” mega-PR.

Commit frequently at coherent points.

---

## 19. Comments and documentation

Avoid the previous failure mode of enormous comment-to-code ratio.

Rule:

> **Comments explain non-obvious intent, constraints, invariants, or trade-offs. They do not narrate code.**

Bad:

```ts
// Check if order exists
if (!order) {
  // Throw an error
  throw new Error("Order not found")
}
```

Useful:

```ts
// Stripe may retry this webhook after entitlement creation.
// This lookup makes certificate issuance idempotent.
```

Do not generate:

* boilerplate comments above every function;
* comments repeating names/types;
* huge implementation essays embedded in source;
* speculative TODOs.

Architecture decisions go in `docs/decisions/`, numbered and dated, in the MADR
format from `architecture`'s `templates/decision.md`. Write one when a
maintainer could reasonably ask why the obvious alternative was rejected; do not
write one for a self-evident detail. Current behaviour goes in `docs/current/`
and is updated in the same commit that changes the behaviour. Known problems
with no active plan go in `docs/issues/`.

Do not let durable knowledge accumulate in `README.md`. On the previous build it
grew from 1,824 to 135,084 bytes in thirteen days — 690 lines of it describing
another repository's Kubernetes manifests — because no `docs/` tree existed to
receive it, and it then became the file the review loop kept failing on.

Code should mostly explain itself.

---

## 20. Agent execution model

Where the development harness supports subagents:

* use a fresh implementation context per task;
* give the implementer only the relevant governance, spec, interfaces, and files;
* do not drag the entire initiative history into every implementation context;
* use a separate reviewer after each task;
* fix review findings before moving on;
* perform a final whole-initiative review before release.

Do not use one huge persistent coding context for all of Lousy Deal.

Work in an isolated worktree at `~/app/.worktrees/lousydeal/<task>`, branched
from `origin/main`. Never commit to a default branch; branch, open a pull
request, and merge once the checks pass. One writer per worktree, and never
write into a dirty or shared one. A fresh worktree holds only tracked files, so
it is not usable until the ignored local state is present — `AGENTS.md` states
what that is.

`standards/agent-operation.md` defines the tiers. Resolve each to whatever the
running runtime exposes, and if a named model is unavailable substitute within
the same tier and record it.

| Tier | OpenAI | Anthropic | Use for |
| --- | --- | --- | --- |
| top | Sol | Fable | source-of-truth conflicts, security policy, final review |
| mid | Terra | Opus | orchestration, integration, judgment |
| low | Luna | Sonnet | bounded execution, inventory, mechanical edits |

**Top tier regardless of apparent simplicity** for anything touching exposure,
secrets, payments, DNS, access policy, the cutover, and **every reviewer**. A
one-line change to a source-range list is an exposure change.

**Never drop a review step to a lower tier silently.** If only a lower tier is
available, record it as an open item for the operator. A lower-tier result the
orchestrator has not inspected is unverified, and unverified is not done.

State the model explicitly on every dispatch. An omitted model inherits the
session's, which defeats this in both directions.

The primary agent keeps architecture, integration, security decisions, and final
verification. A subagent may investigate those; its conclusions are advisory.
Subagents do not commit, push, rotate credentials, change DNS, or deploy unless
explicitly authorised, and never own durable state.

Optimization target is not minimum token price.

Optimization target is:

**high-quality accepted output per unit of time/rework.**

---

## 21. Required review gates

### Gate A — product scope

Before implementation, ensure the V1 scope is internally coherent.

### Gate B — brand/copy

Review actual customer-facing copy separately.

### Gate C — visual design

Approve visual direction before implementation of major user-facing surfaces.

### Gate D — per-task code review

The reviewer is a **separate invocation with fresh context, never the agent that
wrote the code, and always at the top tier** regardless of how small the diff
looks. It receives the same specification the implementer did and reviews the
diff against it, not against general good practice. Hand the diff over as a
file.

Findings are **blocking** (unsafe to merge as written), **major** (wrong or
incomplete against the spec, fixable in this unit, must not ship unfixed) or
**minor** (does not change what the code does; may ship, but is listed in the
pull-request description). Cap the loop at three reviewer passes; on a third
pass still carrying blocking or major findings, stop and ask.

Never tell a reviewer what not to flag, and never pre-rate a finding's severity
in the dispatch.

Check:

* spec compliance;
* code quality;
* tests;
* security;
* maintainability;
* unnecessary abstractions;
* unnecessary comments.

### Gate E — rendered UI review

For every important customer-facing slice:

* run the site;
* inspect desktop;
* inspect mobile;
* exercise actual interactions;
* inspect screenshots/rendered output;
* compare against approved design.

Pay particular attention to:

* homepage;
* checkout entry;
* gift flow;
* certificate;
* Baldrick;
* merch upsell;
* emails.

### Gate F — integration review

Before production:

* exercise complete purchase path;
* verify webhooks;
* verify certificate idempotency;
* verify email;
* verify Printful test flow;
* verify gift behavior;
* verify analytics;
* verify test data cannot leak into public statistics.

---

## 22. Testing

`standards/code-quality.md` governs: use the minimum testing that demonstrates
the behaviour and protects against a likely regression. Test durable behaviour,
not file existence or incidental formatting. Add a focused test for new logic in
the same commit. Do not pursue exhaustive coverage. A high-risk change needs
verification proportional to its operational impact.

The gate is this repository's own linters run in CI, blocking on new work only,
with pre-existing findings baselined once — an ESLint bulk suppressions file for
TypeScript, narrow `# shellcheck disable=` directives for shell. Habit Hooks
coaches inside the edit loop and is **never** a required CI check.

One failure mode is worth naming, because the previous build hit it three times
in one day: every layer verified against the layer beneath it, and nothing
verifying the assembly. 2,959 tests passed green while the live backend returned
500 on every catalogue load. **Run one real-dependency smoke check against a
running Medusa before the first deployment**, not after the third outage.

At minimum cover business-critical behavior around:

* checkout/product configuration;
* certificate issuance;
* duplicate webhook delivery;
* certificate serial uniqueness;
* gifting;
* Printful order creation/idempotency;
* Baldrick state transitions;
* bad-discount pricing;
* authorization/privacy where relevant.

Prefer behavioral tests over tests that merely assert implementation details.

Important end-to-end flows should be browser-tested.

---

## 23. Legal/payment UX guardrails

The joke must never depend on misleading customers.

Ensure:

* customer sees exactly what they are buying;
* final price is explicit;
* price-increasing “discounts” are explicit before payment, and the surcharge
  is a visible cart line rather than a silent adjustment;
* physical merchandise is described accurately;
* gift behavior is clear;
* applicable digital-content/consumer disclosures are handled appropriately;
* privacy/cookie/payment requirements follow existing governance and applicable market requirements.

The product can be a lousy deal.

The checkout must not be dishonest.

### Legal and tax are out of build scope, and gate publication

**Operator decision: legal, tax and consumer-compliance work is not part of this
build.** It is done after the site is functionally ready and before anything is
published. Do not write terms, refund policy, VAT configuration or consumer
disclosures as part of any LD slice, and do not block a slice on them.

Two consequences, and they are binding:

* **Nothing publishes until that gate closes.** No live Stripe keys, no public
  launch, no real customer transaction. Test mode and the gated test environment
  only.
* **V1 must not make that gate harder to pass.** Build so the disclosures can be
  added without rework: an explicit final price before payment, a checkout that
  can carry a consent checkbox, a certificate page that can be made private, and
  an inscription field that can be moderated. Do not hard-code copy that a
  lawyer will later have to unpick from logic.

Carry this list into the gate rather than losing it. The previous build spent
five pull requests on legal pages, VAT and a tax provider, produced a 263-line
legal second opinion, and rewrote the Estonian text twice **after** the
qualified reader had accepted it:

* EU right of withdrawal on immediately-supplied digital content, and the
  express-consent waiver at checkout;
* VAT and OSS by customer location, including intra-country excluded
  territories;
* customer inscription moderation — see §5;
* GDPR on public surfaces: what a certificate page shows, and whether a
  purchaser can make one private;
* chargeback and dispute exposure, and Stripe's terms for a store whose premise
  is paying for almost nothing;
* refund policy;
* privacy, cookie and payment disclosures.

A qualified human reader accepts this. It is an OPERATOR gate: a clean code
review never closes it, and no agent may mark it complete on its own evidence.
Record the acceptance, the date and the exact reviewed text in
`docs/decisions/`, so a later rewrite is visibly a change to something accepted.

Accessibility is **not** deferred to that gate. It is product quality, it is
cheap while building and expensive to retrofit, and it stays in LD-08.

---

## 24. Analytics

Keep analytics useful and minimal.

Track meaningful funnel events such as:

```text
landing_view
tier_selected
baldrick_opened
baldrick_intent
bad_discount_issued
bad_discount_accepted
gift_selected
merch_added
checkout_started
purchase_completed
certificate_shared
```

Enterprise events are deferred with the feature.

Reuse existing analytics conventions where sensible.

Do not build a custom analytics platform.

---

## 25. Explicit non-goals for V1

Do not add unless required by an approved change:

* normal user accounts;
* Enterprise subscriptions, entitlement, renewal and expiry — deferred by
  operator decision; see §10;
* the customer's name anywhere public;
* inscription moderation policy — a decision at the legal gate;
* legal, tax and consumer-compliance work — handled after the build;
* broad merch catalog;
* scheduled gift delivery;
* general monthly Lousy Deal subscription;
* AI/LLM Baldrick;
* marketplace functionality;
* complex loyalty program;
* mobile apps;
* CMS;
* multilingual support;
* elaborate social automation;
* affiliate system;
* crypto;
* custom payment system;
* speculative future architecture.

Maintain a backlog for good ideas instead of silently expanding V1.

---

## 26. Future compatibility

V1 architecture should not block reasonable future ideas such as:

* Lousy Deal of the Month;
* additional Enterprise tiers;
* physical certificates;
* limited-edition merchandise;
* social leaderboards;
* gift campaigns;
* corporate bulk purchases;
* automated social content;
* Baldrick-generated unlock paths;
* absurd promotional events;
* public API;
* customer-submitted testimonials.

Do not build these now.

Design only enough clean boundaries that adding them later does not require rewriting the store.

---

## 27. Where this work lives, and its durable state

**This is not an `architecture` initiative.** Initiatives are for work spanning
several peer repositories with no clear owner. `lousydeal` owns this outcome, so
under `standards/work-routing.md` the plan lives here, in
`lousydeal/docs/working/`, and `architecture` records it only by link in
`notable_local_work`. Do not mirror a journal, ledger or decision log centrally;
this repository keeps the canonical state.

The one exception is the cutover, which goes to `orange-inventory/docs/working/`
because it names live hosts and identities.

This document is a **contract**, not a plan: it has no `- [ ]` rows and nothing
executes from it. Each LD slice gets its own plan under `docs/working/`, written
to `standards/planning.md` — every row sized so one pull request closes it,
naming the files it changes and how it is verified, with its file list inside
one repository.

Retiring a plan updates `notable_local_work` in the same change, relocates
durable facts to `docs/current/`, decisions to `docs/decisions/` and unresolved
residuals to `docs/issues/` before the state is deleted, and does not happen
while a row is still open. The retiring commit says what happened.

At minimum record:

* approved product decisions;
* approved brand direction;
* approved copy;
* approved visual direction;
* architecture decisions;
* implementation slices;
* current slice;
* completed tasks;
* deferred ideas;
* unresolved risks;
* deployment state.

Do not rely solely on conversation context.

A fresh agent should be able to resume the initiative from repository state without reconstructing history.

---

## 28. First action

Do **not** begin coding immediately.

Start by:

1. reading the standards in §2 — they are named, so no searching is required;
2. inspecting the Plepic implementation;
3. producing the reuse/gap assessment;
4. validating the proposed V1 decomposition;
5. identifying any material product/architecture decisions that must be made before design;
6. preparing the first product/brand/design artifacts.

The **first change in any repository** is a small pull request in `architecture`
adding the `lousydeal` entry to `universe/repositories.yaml`. Nothing here is
governed until it appears there, and `sync-baseline` refuses to write into a
repository the catalogue does not know. LD-00 follows; product code does not
start until its audit is clean.

Then stop at the appropriate approval gate before implementation.

Once the product/design specification is approved, produce a concrete implementation plan for **LD-01 only**.

Do not generate implementation plans for the entire initiative in one giant document.

After LD-01 is implemented, tested, reviewed, and accepted, proceed to the next slice using the same discipline.

---

## Success condition

The initiative is successful when LousyDeal.com is:

* funny within seconds of arrival;
* visually polished rather than merely competent;
* easy to buy from;
* easy to gift;
* capable of selling exactly three initial merch items through Printful;
* capable of issuing attractive numbered certificates, downloadable as PDFs;
* carrying the customer's inscription publicly, and never their name;
* equipped with a convincing deterministic Baldrick;
* independently deployable from Plepic Games, live on `lousydeal.com` with a
  gated `test.lousydeal.com`;
* functionally complete and ready for the legal gate, which precedes publication;
* maintainable without excessive infrastructure;
* covered by appropriate tests;
* composed of small understandable changes;
* easy to extend later.

Above all:

**Do not optimize for producing lots of code quickly. Optimize for producing small amounts of good code that implement an already-approved product.**
