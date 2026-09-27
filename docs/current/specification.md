# Lousy Deal product specification

This is the product specification of **LousyDeal.com** as it is built and runs.
The section numbers are stable: source files cite them as
"`specification.md` §N", so a section keeps its number even when its content is
removed. The product concept and its reasoning are in
[`concept.md`](./concept.md). The brand, voice, copy and visual direction are in
[`brand.md`](./brand.md). What the shop takes from Plepic is in
[`plepic-reuse.md`](./plepic-reuse.md). Architecture decisions are in
[`docs/decisions/`](../decisions/). Ideas that are not built are in
[`backlog-candidates.md`](../working/backlog-candidates.md).

LousyDeal.com is a novelty ecommerce site. Customers knowingly pay for a
deliberately poor deal and receive an absurdly polished certificate that
documents it. It is a long-lived small product, and its structure lets future
products, jokes, merch and social mechanics be added without a rewrite.

---

## 1. Operating model

This section described how the V1 build was coordinated. That build completed
on 2026-09-27, and git history holds the text.

One durable rule remains. Product, brand, copy, visual design, architecture and
implementation are separate concerns, and each has its own home: the product in
this document, brand and copy in [`brand.md`](./brand.md), and decisions in
[`docs/decisions/`](../decisions/). How changes are planned, sized, reviewed and
merged is governed by the
[architecture standards](https://github.com/hannosirkel/architecture/tree/main/standards).

---

## 2. Governance first

The repository
[`hannosirkel/architecture`](https://github.com/hannosirkel/architecture)
governs this repository, because `lousydeal` appears in its
`universe/repositories.yaml`. Membership does not depend on any file here. This
repository's generated `AGENTS.md` links each
[standard](https://github.com/hannosirkel/architecture/tree/main/standards) that
applies. Read a standard before you change something it governs.

**Lousy Deal is a separate store and application deployment from Plepic
Games.** It has its own:

* Medusa instance;
* database, one per environment (decision
  [`003`](../decisions/003-own-postgresql-per-environment.md));
* configuration;
* secrets;
* products;
* customer and order data;
* domain;
* deployment lifecycle.

Lousy Deal availability and product behaviour are not coupled to Plepic Games.
It reuses Plepic's proven patterns where they are generic.
[`plepic-reuse.md`](./plepic-reuse.md) records what was reused, what was
adapted, and what Plepic-specific behaviour must not leak in.

---

## 2a. Visibility, secrets, and what may be published

**This repository is public**, and `public_safe_required: true`. It must be safe
to publish on every commit, not cleaned up before a launch.

Being public gives two controls: a branch-protection ruleset, which the GitHub
plan does not offer on a private repository, and GitHub push protection, which
catches a leaked credential *before* it lands rather than after it is in
history.

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
value may be one: such values are read server-side at runtime, and the browser
receives a single serialized runtime-config object. `plepic` does the same.

**Baldrick is public, and that is a product decision.** The repository publishes
his flows, his keyword matching, and every scripted joke, permanently. The
premise is the product and jokes are cheap to add, so this is accepted.

The one exception: if an unlock is meant to be genuinely discoverable, its
**unlock keywords are runtime configuration, read server-side, never
committed.** No unlock is built, so this exception is unused and no unlock
secret exists.

---

## 2b. The company, and the credentials it already holds

### The legal entity

The store is operated by:

| Field | Value |
| --- | --- |
| Company | Aislopica OÜ |
| Address | Pihlaka tn 2, Jüri alevik, Rae vald, Harju maakond, 75301, Estonia |
| Contact | `baldrick@lousydeal.com` |
| Telephone | `+372 51 35463` |
| Registry code | `17584979` |
| VAT number | `EE103022558` |

These are the trader details a customer must be able to find. They appear in the
imprint, the order confirmation, the invoice, the Stripe account, and the sender
identity on transactional email. They are public business-register facts and a
role address, not a person's contact details, so committing them is a
deliberate §2a decision.

That decision does not extend to a director's name or a bank account. Neither is
published.

**Aislopica OÜ is VAT registered**, and the number is committed. The law
requires these disclosures to be **published**, so each field has exactly one
correct value and a placeholder in one of them is a wrong disclosure, not a
withheld secret. Article 6(1) CRD as amended by Directive (EU) 2019/2161 and VÕS
§ 54¹ require the name, registered address, contact address and telephone
number. Article 5(1)(d) of Directive 2000/31/EC requires the register and the
code within it.

The values reach a page the way Plepic delivers them (decision
[`004`](../decisions/004-trader-identity-is-runtime-configuration.md)):

* the storefront reads the seven `MERCHANT_*` variables server-side at runtime;
  `MERCHANT_VAT_NUMBER` is typed `string | null`;
* the Argo CD `Application` in `orange` patches the values from the private
  Ansible inventory;
* `deploys/lousydeal/base/storefront.yaml` carries the real values as literals.
  They are the fallback the patch supersedes, so a manifest applied without
  Orange still publishes a lawful imprint.

There is one company, so none of these values is per-environment.

### Credentials the operator has provided

Each environment has its own Stripe keys, Printful store token and webhook
signing secret, and SMTP credentials. Test uses Stripe test mode and a Printful
test store (§15). No value is written here or anywhere in the repository.

### Seeding is build work, not operator work

The operator puts a file in `.keys/` and says so. **Everything after that is
automated work through `orange`, on the sanctioned path.** Nobody types a secret
into a cluster by hand, and no secret value is written into `lousydeal` or
`deploys` in any form.

The path, which `plepic` also uses:

| Step | Where | What happens |
| --- | --- | --- |
| 1 | `orange/.keys/<source>` | the operator's file: ignored, never committed |
| 2 | `orange` `roles/openbao/defaults/main.yml` | `<source>` is registered in `openbao_seed_allowed_sources` |
| 3 | `orange` `scripts/openbao-admin` | the import entry: mount, path, source, parser |
| 4 | `orange` `playbooks/openbao-seed.yml` | writes the named sources into OpenBao |
| 5 | External Secrets | renders the OpenBao value into the namespace |
| 6 | `deploys/lousydeal/` | references the `ExternalSecret`, and holds no value |

`orange` `docs/current/provisioning.md` § *Plepic credential lifecycle* and
`docs/current/cluster.md` § *Plepic reconciliation* are the worked examples,
including the separate `-test` mount that keeps test and live credentials
apart.

Three rules follow:

* **An `orange` change is its own pull request in `orange`**, ordered before the
  `lousydeal` change that needs the secret.
* **Each credential write is an effect gate** (§15). Approve one at a time,
  immediately before execution, each with its stated rollback. Never seed test
  and live in one step.
* **A wrong value is a rotation, not a re-run.** A credential that has been
  written once has been logged somewhere; replacing the file does not un-write
  it.

**The naming is settled by decision
[`006`](../decisions/006-two-naming-categories-in-keys.md).** `.keys/` holds two
categories and they do not share a convention. A *registered source* is
application-first and appears in `openbao_seed_allowed_sources`:
`lousydeal-test-runtime-credentials`. A *provider staging file* is
provider-first and appears in no seed list: `stripe-lousydeal-test`, as
`stripe-plepic-sandbox` beside it is. The Stripe values reach the runtime as
keys inside the registered source, not as a source of their own. Read `006`
before you change a name here.

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

The shop sells three certificate tiers (§4.1), four merch items (§7), and gifts
(§6). Prices are in USD, and the advertised price is what the customer pays: the
merchant absorbs the VAT (decisions
[`007`](../decisions/007-usd-and-tax-inclusive-pricing.md) and
[`009`](../decisions/009-merchant-absorbs-the-vat.md)).

### 4.1 Core deals

The three products:

#### Lousy Deal — $5

Customer receives:

* a unique numbered Lousy Deal;
* a polished digital certificate;
* a permanent public certificate page.

#### Lousy Deal Plus — $10

Essentially the same economic value as the $5 product.

Differences are mostly:

* Plus branding;
* more prestigious certificate treatment;
* stronger implication that paying more was a worse decision.

#### Lousy Deal Pro — $25

Again essentially the same underlying economic value.

It provides:

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
the PDF, or any counter. The deal record has no column that could hold it.

What appears instead is what the buyer chose to type. Two optional fields, both
entered at checkout, both shown to the buyer as public before they pay:

| Field | Limit | Purpose |
| --- | --- | --- |
| display name | 60 characters | who the certificate names, if anyone |
| dedication | 120 characters | the shareable line |

Together they are the **inscription** — the term the rest of this document uses
for whatever the buyer chose to make public. The 60-character display-name limit
is what fits on one line of the certificate's bearer row at 390px.

Both are optional, and an empty pair renders well. Most buyers leave both
blank, so the bearer row then reads "The bearer" and the certificate looks
deliberate rather than unfinished.

**Sanitisation is a build requirement, not a moderation policy.** The
storefront filters at entry and the backend filters again when it reads the
order, with identical rules held equal by a test. The filter strips:

* markup, scripts, and anything that could execute or style;
* URLs and bare domain names;
* email addresses;
* phone numbers.

Filtering runs before the length limit, so the limit counts what will actually
appear. An over-long value is truncated, not rejected.

That is a mechanical filter against the public page becoming a free billboard or
a phishing surface. It is not a judgement about content.

**Moderation policy is not written.** An operator can hide a certificate or
blank either field without a schema change, without a new serial, and without
reissuing the certificate. The deal's `status` is `issued` or `hidden`. A hidden
certificate answers exactly as an unknown slug does, so hiding cannot be used to
enumerate addresses. The rendered certificate is always derived, never stored
as the only copy.

Each certificate carries:

* the display name and dedication, when present — never the order's billing name;
* the serial, set as the certificate's name;
* the tier;
* the amount paid;
* the issue date;
* a stamp;
* a closing clause.

It carries no QR code and no signature. Its exact wording is in
[`brand.md`](./brand.md) §4, *Certificate*.

Certificates are:

* viewable on the web, at a clean public URL;
* shareable, with share links and a social card;
* available as a PDF at their own URL;
* deterministic and regenerable from stored deal data.

### The PDF, its renderer, and its URLs

The certificate page carries the certificate and a share row (§11).

**The PDF is vector-rendered** with PDFKit in the storefront, not produced by
driving a headless browser. It is a second layout, and it is allowed to drift
from the HTML certificate: the page and the document are each free to be right
for their own medium. Two layouts is the accepted cost of not shipping a browser
in an image.

**A layout is versioned, and an issued certificate keeps the layout it was
issued under.** When the design changes, new deals get the new layout and every
existing deal still renders exactly as its holder first saw it. The deal stores
its layout version; a retired layout stays in the codebase and stays tested.
Redesigning is additive. It never restyles a certificate somebody already owns.
The renderer refuses a layout version it does not know rather than falling back
to the current one. The current layout is version 1.

**No object storage.** The PDF is rendered by the application and served by the
application. There is no bucket, no external storage credential, and no storage
outage that can take a certificate offline. The deal record is the source of
truth.

### URLs

```text
lousydeal.com/done-deals/{slug}
lousydeal.com/done-deals/{slug}/certificate.pdf
```

* **`{slug}` is opaque and random.** It is 16 characters drawn from a
  30-character alphabet, about 78 bits. It is not the serial, not sequential,
  and not guessable. A public URL nobody can enumerate is the entire reason it
  exists.
* **The serial is a sequential display number** — `Lousy Deal #18,421` — and it
  appears on the certificate, in the share card, and in the counter. It never
  appears in a URL.
* The two are independent. The slug addresses the deal; the serial names it.
  Neither is derivable from the other.
* Sequential serials publish the true order count. The sequence starts at 1 and
  is never offset to look busier: §11 forbids fabricated transaction totals, and
  a serial that overstates volume is exactly that. A rolled-back insert can
  leave a gap, which understates volume rather than overstating it.
* Nothing on the site links to a certificate. The sitemap lists no
  `/done-deals/` path, the page asks search engines not to index it, and the PDF
  and the share card send `x-robots-tag: noindex, nofollow`.

---

## 6. Gift purchases

A customer can purchase a Lousy Deal as a gift.

The checkout supports:

* recipient name (optional, 60 characters);
* recipient email (required for a gift);
* sender name (optional, 60 characters);
* message (optional, 120 characters);
* immediate delivery.

Scheduled delivery is not built.

The recipient receives the certificate link by email. A deal is a gift when it
has a recipient email. The recipient's and the sender's details are never
public: the certificate page shows only the inscription (§5).

The copy reinforces the premise. Its final text is in [`brand.md`](./brand.md)
§4, *Gift block*.

Gift purchases require no account registration.

---

## 7. Merch

Printful fulfils the merch.

The merch catalog is deliberately tiny:

1. one T-shirt design;
2. one mug design;
3. one sticker design;
4. **one trucker cap design** (amended by the operator on 2026-09-08).

There is no broad merchandise catalog.

**The fourth entry is an amendment and is marked as one.** The operator added
the cap when merch was built: a cap carries the domain in a way a sticker
cannot, and the sticker was kept rather than displaced. Four is still tiny and
still a punchline.

The merch exists primarily as a punchline/upsell.

The preferred UX concept is:

> **Would you like to make your deal worse?**

Merch uses the Medusa product, order and fulfillment model, not webhook hacks.

Printful is a small in-repo Medusa fulfilment provider module
(`backend/src/modules/printful`), not a community integration.

It handles:

* product mapping;
* variants;
* shipping address and live shipping rates;
* fulfillment creation;
* Printful order creation;
* status synchronization through signed Printful webhooks, including the
  shipped-parcel email;
* error handling and idempotency;
* test/live separation, with a separate Printful store per environment.

**Idempotency rests on Printful.** The Medusa order id is Printful's
`external_id`, which Printful holds unique per store, so a replayed order is
refused there. A local `printful_submission` row records each order's outcome
(`submitted`, `skipped`, `canceled` or `failed`) so that a replay stops before
the network. Nothing retries automatically.

---

## 8. Baldrick

**Baldrick** is the site's deterministic sales and support chatbot.

Baldrick is a character and commerce mechanic, not merely an FAQ widget.

No LLM backend.

He uses:

* predefined conversational flows;
* state;
* keyword/phrase matching where useful;
* buttons/quick replies;
* deterministic/randomized response pools;
* typing indicators;
* realistic pauses;
* multi-message replies.

Baldrick appears sufficiently conversational while remaining completely predictable and cheap to operate.

His intents are:

* enterprise;
* subscription;
* gift;
* inscription;
* discount;
* price;
* refund;
* complaint;
* identity;
* licensing;
* support;
* pleasantry;
* what do I get?;
* fallback.

Limited comprehension is acceptable and can be part of the character.

Do not build sophisticated NLP unless actual usage demonstrates a need.

---

## 9. Baldrick discount mechanics

Baldrick issues apparent “discount” codes that make the customer's deal worse.

The codes:

| Code | Effect |
| --- | --- |
| `BALDRICK20` | +20% of the certificate's price |
| `SAVE10` | +10% of the certificate's price |
| `FREE` | adds a $1.00 fee |
| `BLACKFRIDAY` | +0%, a real $0.00 line |

A code applies only to a cart that holds a certificate. A cart carries at most
one surcharge; a new code replaces the previous one. Codes match after trimming
and folding ASCII case, and nothing more. No code and no input can lower a
price. No code unlocks a product.

Important:

* never deceive the customer about the final payable price;
* the modified price must be obvious before checkout;
* humor must come from knowingly accepting a worse deal;
* payment/legal UX must remain legitimate.

Code usage is tracked, so analytics can answer:

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

The fee is an ordinary custom-priced cart line item with no variant. That is a
supported Medusa customization path, and it is what makes totals, tax, checkout
and the resulting order all agree on $6 without a parallel pricing engine beside
them. One workflow, `apply-surcharge`, is the only path that adds it, and it
holds the cart lock while it removes the old line and adds the new one.

The item carries metadata, in major units:

```ts
{
  internal_type: "baldrick_surcharge",
  code: "BALDRICK20",
  base_amount_major: 5,
  percentage: 20,        // or fee_amount_major for a fee code
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

**Enterprise is not built.** There is no subscription, no recurring billing, no
entitlement, and no expiry. A certificate's validity is unconditional. Enterprise
is a backlog candidate in
[`backlog-candidates.md`](../working/backlog-candidates.md).

It is the hardest feature: real lifecycle state, auto-renewal disclosure, and
revoking something a customer paid for. The design below is kept so the
architecture does not block it (§26). Baldrick answers Enterprise questions
(§8), but nothing unlocks it.

### Lousy Deal Enterprise, as it was conceived

* discovered or unlocked through Baldrick, never listed alongside normal pricing;
* annual subscription/license;
* one-year certificate entitlement;
* one year of “support”;
* support wording may include caveats such as Baldrick being available/interested;
* Enterprise certificate remains publicly available only while the subscription/license is active;
* when entitlement expires, the public page becomes an appropriately branded expired-license page;
* renewal restores entitlement.

The Enterprise experience would parody B2B SaaS licensing, with themes such as
enterprise-grade disappointment, dedicated account neglect, priority
indifference, support for up to zero users, certificate licensing and renewal
management.

The subscription and cancellation flow must not be deceptive or difficult. It
would use the Stripe/Medusa recurring-payment capabilities of the current stack
rather than a new subscription engine.

---

## 11. Public counters and shareability

The shop has lightweight, honest shareable mechanics:

* a counter on the home page: total number of lousy deals, total nominal amount
  spent on them, and the latest deal number;
* a share row on each certificate page: X, Bluesky and email;
* a social card image for each certificate.

Deal milestones are not built.

Every counter figure is computed from the `lousy_deal` table and nothing else:
no floor, no offset, no seeded starting value, and no rounding up. A hidden
certificate still counts, because hiding is a decision about a page, not a claim
that the sale did not happen.

Do not fabricate customers, transaction totals, testimonials, or reviews.

Demo/test data must never appear as real customer activity in production. Each
environment has its own database, so test orders cannot reach live counters.

Real testimonials may be added later with proper customer consent.

Marketing jokes must not masquerade as actual customer reviews.

---

## 12. Accounts

Customers do not create accounts.

The flow:

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

There is no account system and no order lookup. The order confirmation email
carries the certificate link, and a link is not re-issued, so that email is the
customer's only copy. An account system is a backlog candidate in
[`backlog-candidates.md`](../working/backlog-candidates.md); Enterprise (§10) is
the feature that would need identity handling.

YAGNI.

---

## 13. Brand and copy phase

Implementation does not invent the brand as it codes. The brand and voice
specification and the approved copy for every surface are in
[`brand.md`](./brand.md): brand personality, Baldrick's personality, humor rules,
phrases to avoid, the treatment of customers, and the copy for each page,
flow, email and error state.

Copy lives in content files, not in components, so it can change without a
logic change (decision
[`004`](../decisions/004-trader-identity-is-runtime-configuration.md)).

Copy is reviewed as copy, never buried inside a frontend change.

---

## 14. Visual design phase

The approved visual direction is in [`brand.md`](./brand.md) §3. It covers the
home page on desktop and mobile, the tier section, Baldrick's chat, the
certificate page, the gift flow and the post-purchase upsell, with real copy.

A user-facing change is compared against that direction in a running browser,
on desktop and on mobile.

A passing unit-test suite does not constitute visual acceptance.

---

## 15. Technical direction

The stack:

* Medusa;
* Next.js / TypeScript;
* PostgreSQL;
* Stripe;
* Printful;
* SMTP for transactional email, in the `plepic` shape: a Medusa notification
  provider over nodemailer, with credentials supplied per environment. The
  transactional emails are the order confirmation, the gift message, the
  shipped-parcel notice and the withdrawal receipt. **Brevo is reserved as a
  newsletter tool only**; no newsletter is built, and it is never the
  transactional path.

Reuse Plepic conventions where they are generic and proven.

### Deployment

**The shop runs on the Orange cluster, the same shape as `plepic` and
`servitium`, with a test and a live environment.**
`standards/gitops-and-deployment.md` governs it, and this repository declares it
as `extra_standards`.

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

The repository builds two images, backend and storefront (decision
[`001`](../decisions/001-one-repository-two-images.md)), and live is rebuilt
from merged `main` (decision
[`002`](../decisions/002-rebuild-live-from-merged-main.md)).

Rules that bite:

* **Promote by digest, never by tag.** A tag moves; a digest does not. Roll back
  by promoting a known-good digest, never by editing live cluster state.
* A live promotion is merge-promoted; a test promotion is label-promoted and its
  overlay is replaceable.
* **Merging is an effect gate here.** The merge *is* the deployment, so it takes
  its own approval worded as a deployment, never bundled with the review
  approval. A label, comment or workflow dispatch that triggers a build or
  promotion is an effect gate on the same footing.
* A pull request that *adds* a `push`-triggered workflow fires it on merge.
* **A merge is not a deployment.** Before claiming anything about a running
  environment, check that Argo CD is Synced and that the pods started after the
  merge.
* Every manifest change renders and schema-checks before it can reach Argo CD:
  `kubectl kustomize <overlay> | kubeconform -strict -summary`.
* `deploys` is public and must never carry a secret value.
* Adding a promotion path to `deploys` needs the promoting workflow registered
  as a bypass actor on its ruleset. Adding `required_status_checks` without that
  silently stops every promotion.

### Environments and domains

Two environments, the `plepic`/`servitium` shape:

| Environment | Host | Access |
| --- | --- | --- |
| live | `lousydeal.com`, with `www.lousydeal.com` redirecting to it | public |
| test | `test.lousydeal.com` | Cloudflare Access, Google identity |

Rules:

* **`www` is a redirect, not a second origin.** One canonical host, so
  certificate URLs, share cards and analytics do not split across two.
  Canonicalise at the edge.
* **The test environment is gated at the edge by Cloudflare Access**, not by
  application-level auth and not by robots directives, with a short Access
  session.
* Test runs in **Stripe test mode** and against a Printful test store. A live
  key never reaches test, and test and live credentials are never written in one
  step or one effect gate.
* **Test data must not leak into public statistics** — the global counter and
  deal serials are live-only.
* The Medusa Admin has a hostname in each environment, reachable only through
  Cloudflare Access (decision
  [`010`](../decisions/010-the-admin-is-reachable-and-gated.md)). No
  administrative path is reachable without authenticating at the edge.
* DNS publication, the Access policy, and each credential write are individual
  effect gates, approved one at a time immediately before execution, each with
  its own stated rollback.

Plans that name live hosts or identities go to the private `orange-inventory`,
under `standards/work-routing.md`, never here.

**`STORE_OPEN`** is a runtime setting. It defaults to `false` and fails closed:
the storefront explains that orders are closed, and the server rejects cart,
checkout and payment mutations. Both environments run with it `true`.

### Redis

**Redis is in.** Medusa 2.x uses it for the event bus and the workflow engine
outside development, and `plepic` runs it the same way: a backend that refuses
to start rather than starting half-wired, plus a separate worker mode.

* **Fail closed on a missing or wrong Redis.** A preflight refuses to start,
  rather than letting Medusa fall back to an in-memory bus that silently drops
  events the moment there is a second replica.
* **Keep the password out of the connection string**, in the client options
  instead, so no connection *string* can carry it into a log.
* A wrong `REDIS_PASSWORD` is a credential-rotation event, not a restart.
  Restarting a pod does not un-write a password that has already been logged.

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

Medusa is the source of truth for normal commerce concepts:

* product;
* cart;
* order;
* payment;
* fulfillment;
* customer/address where applicable.

A small `deal` module holds only Lousy-Deal-specific concepts.

```text
lousy_deal
- id
- order_id              unique; one order, one certificate
- serial                sequential, displayed, never in a URL; unique
- public_slug           opaque, random, addresses the deal; unique
- tier                  the tier's title, copied at issuance
- amount_paid
- currency_code
- display_name          optional, sanitised, public
- dedication            optional, <= 120 characters, sanitised, public
- gift_recipient_name   optional, never public
- gift_recipient_email  present exactly when the deal is a gift, never public
- gift_sender_name      optional, never public
- gift_message          optional, never public
- layout_version        frozen at issuance
- status                issued | hidden
- issued_at
```

The customer's billing name lives with the order, never with the deal. There is
no stored PDF reference: the document is derived from these fields and their
layout version, every time it is asked for.

`expires_at` is deliberately absent. It would exist for Enterprise entitlement,
and Enterprise is not built (§10). Adding it later is a migration, not a
redesign.

The `printful_submission` table records what the shop has sent to Printful, one
row per Medusa order (§7). It is a record, not the idempotency lock.

Do not duplicate complete order/payment state into custom tables.

Certificate issuance is idempotent: the unique `order_id` is the guarantee, and
the `order.placed` subscriber reads the deal back rather than trusting an error.

Stripe/webhook retries must not generate duplicate certificates, Printful orders, or gifts.

---

## 17. Implementation decomposition

This section described the V1 build process, which completed on 2026-09-27; git
history holds the text.

---

## 18. Task and PR sizing

This section described the V1 build process, which completed on 2026-09-27; git
history holds the text.

---

## 19. Comments and documentation

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

Where documentation goes is governed by `standards/documentation.md` in the
[architecture standards](https://github.com/hannosirkel/architecture/tree/main/standards).
In short: architecture decisions go in `docs/decisions/`, numbered and dated, in
the MADR format; current behaviour goes in `docs/current/` and is updated in the
same commit that changes the behaviour; known problems with no active plan go in
`docs/issues/`.

Durable knowledge does not accumulate in `README.md`.

Code should mostly explain itself.

---

## 20. Agent execution model

This section described the V1 build process, which completed on 2026-09-27; git
history holds the text.

---

## 21. Required review gates

This section described the V1 build process, which completed on 2026-09-27; git
history holds the text.

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

Verify the assembly, not only each layer. Tests that each check one layer
against the layer beneath can all pass while the running backend fails, so a
real-dependency smoke check runs against a running Medusa.

Business-critical behavior covered by tests:

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

The shop ensures:

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

### The legal documents, and the closed legal gate

The legal documents are written, at the operator's instruction (decision
[`011`](../decisions/011-legal-documents-inside-ld-09.md)), and published under
`/legal`: imprint, terms, privacy, refunds, and a withdrawal form whose receipt
is emailed. The VAT arrangement is decisions
[`012`](../decisions/012-vat-for-goods-printful-dispatches.md) to
[`015`](../decisions/015-where-the-parcel-is-dispatched-from.md). The operator
closed the remaining legal-gate items on 2026-09-10 as accepted exposures, and
the live store is public and open.

The legal documents cover:

* EU right of withdrawal on immediately-supplied digital content, and the
  express-consent waiver at checkout;
* VAT and OSS by customer location, including intra-country excluded
  territories;
* customer inscription moderation — see §5;
* GDPR on public surfaces: what a certificate page shows;
* chargeback and dispute exposure;
* refund policy;
* privacy, cookie and payment disclosures.

Legal copy lives in content files, never in logic, so a lawyer can change it
without unpicking code. A rewrite of accepted legal text is recorded in
`docs/decisions/`, so it is visibly a change to something accepted.

Two retention facts: the inscription is kept with the order for seven years,
and the deletion of seven-year accounting records is done by hand, not by a job.

Accessibility is product quality, not a legal-gate item.

---

## 24. Analytics

Analytics is useful and minimal.

The entire event vocabulary:

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

Adding an event name is a product and privacy decision.

Google Analytics and Meta Pixel load only after the visitor opts in; consent
defaults to denied. They run in an isolated frame that reports a fixed location,
so no page URL or certificate slug reaches them. The test environment has no
analytics. How the reports are read is in
[`provider-reporting.md`](./provider-reporting.md).

Enterprise events are deferred with the feature.

Do not build a custom analytics platform.

---

## 25. Explicit non-goals for V1

None of these is built. Each is added only by an approved change, and the ones
worth keeping are backlog candidates in
[`backlog-candidates.md`](../working/backlog-candidates.md):

* normal user accounts;
* Enterprise subscriptions, entitlement, renewal and expiry — see §10;
* the customer's name anywhere public;
* a written inscription moderation policy;
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

Good ideas go to the backlog instead of silently expanding the product.

---

## 26. Future compatibility

The architecture does not block reasonable future ideas such as:

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

None of these is built. Each is a backlog candidate in
[`backlog-candidates.md`](../working/backlog-candidates.md).

Design only enough clean boundaries that adding them later does not require rewriting the store.

---

## 27. Where this work lives, and its durable state

This section described the V1 build process, which completed on 2026-09-27; git
history holds the text.

---

## 28. First action

This section described the V1 build process, which completed on 2026-09-27; git
history holds the text.
