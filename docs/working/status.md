# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not.

| | |
| --- | --- |
| Updated | 2026-09-08 |
| Current slice | **LD-04 — Printful and the merch upsell**, planned and started 2026-09-08. LD-05 complete 2026-09-08; LD-03 complete 2026-09-08; LD-02 complete 2026-09-07; LD-01 closed by the operator 2026-09-06; LD-09 complete. |
| Next action | Execute [`ld-04-merch.md`](./ld-04-merch.md). `P1` and `P2` are done; **`P3a` is next and is in `orange`** — seed the Printful token to OpenBao. The VAT arrangement is settled in decision [`013`](../decisions/013-the-vat-arrangement.md) and needs two registrations in e-MTA before merch goes on sale. LD-06 follows LD-04 and inherits one written liability: `storefront/src/content/baldrick.ts` says a discount code exists and is not finished, which LD-06 makes false. |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Next action, in full

**LD-04 is the current slice**, planned in
[`ld-04-merch.md`](./ld-04-merch.md): four printed things sold as an upsell and
fulfilled by Printful. Fifteen rows, and five of them are not the shop — this
site sells one digital product supplied immediately, and every legal surface it
has is written for exactly that. A mug is not that.

**Its VAT arrangement is settled and is a document of its own**, decision
[`013`](../decisions/013-the-vat-arrangement.md): everything filed in Estonia,
the KMD plus a Union OSS return, plus the small-enterprise scheme's `EX` number
for supplies located in Latvia. No other country's registration, and no country
blocked. Spain's fulfil-and-deliver-inside-Spain case and the United Kingdom are
recorded there as accepted exposures rather than as coverage; the UK is decided
on a first-sale basis and blocks nothing.

**Both operator actions that gated the sale of merch are done**, as of
2026-09-09: the Union OSS registration and the `EX` notification, both in
e-MTA. Nothing in decision `013`'s scheme is now waiting on a registration.

**Decision `009` is reopened by that arrangement.** Registering for OSS most
likely moves the $5 certificate to destination VAT as well, so a single absorbed
Estonian rate becomes one between 17% and 27%. It adds no filing and LD-04 does
not close it.

**Four products exist in the `Lousydeal Test` store** as of 2026-09-08, with
artwork Printful fetched from this public repository at a pinned commit — which
removed the only thing that had needed a Cloudflare Access change.

**LD-05 is complete**, recorded in
[`ld-05-baldrick.md`](./ld-05-baldrick.md): nine rows in `lousydeal` only,
building the deterministic sales and support character §8 asks for. No LLM, no
network call, no stored conversation — every reply is a string this repository
ships, chosen by rules it can test. Merged as pull requests 126 to 136.

**Its acceptance is a transcript, and the transcript is in the plan.** No
assertion covers whether a conversation reads like one, so B7 held a real ten-turn
exchange against a production build in Chromium, from the keyboard only, and put
the result in the record for the operator to read.

**Gate E found a defect that only a rendered site could show.** Interrupting him
mid-reply discarded the rest of what he had already decided to say, leaving
questions in the transcript with no answers under them. Stopping a turn now
returns the lines it did not reach, and a new question flushes them rather than
dropping them — the same rule the reduced-motion path already followed, which
collapses the wait and never the content.

**Gate D found that the intent list had been closed too early.** Twenty-seven
realistic questions were fed through the matcher and nine went somewhere
indefensible, the worst being that "are you a real person" reached the fallback.
Five intents were added, each with a recorded reason, and the routing table is
now a standing test.

**LD-04 is deferred, not skipped.** It needs a Printful account and sandbox,
which the operator items below record as not held. Building a fulfillment
provider against an API nobody has called would be guessing at its shape, which
is the one thing this codebase's method rules out.

**The slice opens by amending the identity, which is why B1 is first.**
`brand.md` §6 forbids client-side JavaScript outside three named exceptions and
forbids animation beyond a colour change and the loading cursor. §8 asks for
typing indicators, pauses and messages arriving one at a time. LD-09 anticipated
the collision — "Baldrick arrives in LD-05 and needs his own voice section,
written then" — and the operator settled it on 2026-09-08 in favour of a real
chat widget with the identity amended to admit it.

**With scripting off Baldrick is not rendered at all**, rather than rendered
dead. He gates only Enterprise, which §10 defers out of V1, so no purchase path
depends on him and every one of them still works without scripting.

**LD-03 is complete**, recorded in
[`ld-03-gifting.md`](./ld-03-gifting.md): nine rows in `lousydeal` only, letting
a buyer pay for a certificate somebody else receives. No `deploys` or `orange`
change — it added no secret, no environment value and no network destination,
and reuses the mail transport LD-02 built.

**It has been driven end to end.** G9's Gate E paid for a gift on the test
environment with a Stripe test card, to a recipient at a different address from
the buyer's. The order issued a deal carrying all four gift columns, sent the
§ 55 confirmation to the buyer and the gift message to the recipient, and the
certificate it produced carries none of the recipient's details in its HTML, its
PDF text or the PDF's raw bytes.

**Two decisions were settled by the operator on 2026-09-07 before planning.**
The recipient's name does not appear on the public certificate — the public
fields stay §5's `display_name` and `dedication`, which the buyer types about
themselves. And a buyer's withdrawal does not automatically revoke a gift
certificate; the § 56⁴(4) receipt reaches a person who decides.

**The sharpest open question is still G7's, and it is now written down rather
than anticipated.** A gift means processing a third party's name and address,
supplied by somebody else, to send one message. GDPR Article 14 requires
informing a data subject whose data was not obtained from them; Article 14(3)(b)
requires it at the latest at the first communication, which the gift message is.
That message carries the short version — where the address came from, that it is
used once, that we will not write again, how to object — and points at
`/legal/privacy` §6, which is addressed to that reader. Article 12(1) permits
information to be accessible rather than exhaustively recited.

**The retention answer is the uncomfortable one.** A recipient's address is part
of the order record and is kept the same seven years Estonian accounting law
requires — longer than sending one message needs. Separating it would mean
keeping a second record of who was sent what, which is more data about that
person and not less. The policy says so plainly.

§23 reserves whether either position is right to the operator and a qualified
human reader.

**LD-01 was closed by the operator on 2026-09-06** and **LD-09 is complete** —
sixteen rows, `V0` to `V15`, merged as pull requests 71 to 83 in this repository
and 35 in `deploys`. The plan and its record are
[`ld-09-visual-identity.md`](./ld-09-visual-identity.md).

**LD-02 is complete**, recorded in
[`ld-02-certificates.md`](./ld-02-certificates.md): sixteen rows across three
repositories, issuing a deal for a real order, addressing it at
`/done-deals/{slug}`, rendering it as a page and a vector PDF, and sending the
§ 55 confirmation the publication gate was waiting on. The transactional mail
credentials were supplied on 2026-09-06, seeded to OpenBao by `C11`, and reach
no repository.

**It has been driven end to end.** C15's Gate E paid for a certificate on the
test environment with a Stripe test card, and the order issued a deal, sent the
confirmation, rendered the certificate and produced the PDF. That order also
found the one defect that mattered: `amount()` in the order-placed subscriber
rejected the `BigNumber` Medusa hands money over as, so every paid order had
been producing nothing while 1,318 tests passed. Fixed, mutation-checked, and
the fixtures now carry the real class.

Two things are still waiting on the operator, and they are not the same kind of
thing.

### 1. The legal gate (§23)

**Eighteen items, ten of them closed**, are recorded in the gate list at the
foot of [`ld-09-visual-identity.md`](./ld-09-visual-identity.md), and §23 makes
closing them an operator gate that a qualified human reader closes. Four
documents are drafted and every provision in them is cited to the redaction of
the Law of Obligations Act in force on 2026-09-06; that is drafting, not advice,
and this initiative does not treat it as advice.

**Eight remain, and only two are work.** LD-02's § 55 confirmation (11) and a
deletion job for the seven-year accounting record (15) are build tasks in
slices that have not started. The other six — 8, 10, 12, 13, 17, 18 — are
judgement, and two of them are where a pragmatic reading and a supervisory
authority's may diverge most:

- **8 · The consent is a condition of ordering.** There is no way to buy
  without giving up the right, and § 56²(9) voids a term that hinders its
  exercise.
- **17 · `__stripe_mid` is a 365-day device identifier** on this site's own
  domain, for fingerprinting, with no consent asked. The notice states the
  position taken; it does not resolve the ePrivacy question.

**The § 56⁴ withdrawal button exists**, at `/legal/withdraw`, in the footer of
every page and working with scripting off. `C14` made its confirmation control
transmit: it records the withdrawal and sends the § 56⁴(4) receipt on a durable
medium, still with no JavaScript, verified against the deployed site.

**Gate item 11 is closed** — the § 55 confirmation is built and sending. Items
12 and 13 are narrowed by `C13` and remain open. Seven items remain, and only
one of them is work: the deletion job for the seven-year accounting record
(15), still unassigned.

### 2. Six merchant values in the private inventory — supplied

**Not secrets, and not OpenBao.** §2b's open decision was settled on 2026-09-06
and the answer is the reference project's: the trader identity is injected by
Orange's Application from `argocd_lousydeal_environments[*].merchant`, whose
committed values are placeholders and whose real values live in the operator's
private Ansible inventory.

**This is done.** The real six — legal name, address, email, telephone,
registry code, VAT number — are under that key in the private `orange.yml` for
both environments, added while deploying `C11`, and the deployed test
environment renders `Aislopica OÜ` rather than the placeholder. The private
inventory is gitignored and machine-local, so this is recorded here rather than
committed anywhere.

`deploys/lousydeal/base/storefront.yaml` carries the real values as a fallback
the patch supersedes, for the reason `deploys/plepic`'s does: a manifest applied
without Orange should still publish a lawful imprint rather than a page of gaps.

**The imprint is complete either way.** Verified 2026-09-06: served from a built
server with all six configured, it renders no gap and no incompleteness notice —
the first time that has been true.

### What LD-02 needed from the operator, and what is left

The SMTP submission host, port, TLS servername and destination CIDR are in the
private `orange.yml` for both environments, and mail is sending from both.

Two items in that plan's `OWNER MUST FILL` are still open and neither blocks
anything built: the retention period for the inscription as distinct from the
order, and whether a buyer may ask for a certificate link again. There are no
accounts (§12), so today the confirmation email is the only copy of that URL.

**The one acceptance item that could not be automated is closed.** C15 sent two
§ 55 confirmations and one § 56⁴(4) receipt, and G9 sent a gift message to a
real Gmail account. The operator confirmed on 2026-09-08 that they arrived.

The Gmail delivery is the one worth keeping: unsolicited, from a domain the
recipient had never corresponded with, about a purchase they did not make — the
worst case a transactional sender has — and it landed rather than being filed as
spam. The DKIM signing corrected during LD-02 is working.

## Operator items

What is actually held, as against what the contract expects in §2b.

| Item | Held | Note |
| --- | --- | --- |
| Domain `lousydeal.com` | yes | DNS not yet published |
| Company identity, Aislopica OÜ | yes | §2b |
| Stripe test-mode keys | yes | `.keys/stripe-lousydeal-test` in the Orange checkout, provider-first per `006` |
| Merchant identity in the private `orange.yml` | **yes** | added 2026-09-07 while deploying `C11`; the test environment renders `Aislopica OÜ` |
| Stripe live keys | no | not before the publication gate, by design |
| Printful account and store API token | **yes** | supplied 2026-09-08 for the `Lousydeal Test` store. The first token carried only `orders/read`; regenerated the same day with the eight scopes LD-04 needs, verified by read-back |
| Content to receive a returned parcel at the registered address | **yes** | confirmed by the operator 2026-09-09. § 56²(1) returns a withdrawn item to the trader and Printful does not take back goods it made to order, so Refunds §6.1 sends it to the Imprint address — which the operator is content to receive at |
| Article 28 processing agreement with Printful | **held, by incorporation** | Printful's Data Processing Terms are incorporated into its Terms of Service by reference (ToS §19), so acceptance on sign-up concludes it. There is nothing to countersign. The operator agreed 2026-09-09 to archive the version in force and retrieve the sub-processor list, which is behind a login and not on the public page |
| Union OSS registration in e-MTA | **yes** | registered by the operator 2026-09-09. Decision `013`; the quarterly return is the one new filing merch adds |
| Small-enterprise scheme (`EX` number) in e-MTA | **filed** | the *eelteade* was filed by the operator 2026-09-09; the `EX`-suffixed number follows within 35 working days. Decision `013`; this is what makes a Latvia-dispatched, Latvia-delivered sale exempt without a Latvian registration |
| SMTP transactional credentials | **yes** | supplied 2026-09-06, live and test; in the Orange key store, seeded to OpenBao by `C11` |
| SMTP submission host, port, servername and destination CIDR | **yes** | added 2026-09-07; mail verified sending from both environments |
| Cloudflare Access policy for `test.lousydeal.com` | yes | measured 2026-09-05: all three hostnames answer 302 to Access |

Every runtime credential the deployment reads is seeded, and every inventory
value LD-02 needed is in place. What remains on this list is Stripe live keys
and Printful, both deliberately after the publication gate.

## Deployment

Both environments run the storefront and are gated. Measured 2026-09-05:
`lousydeal.com`, `www.lousydeal.com` and `test.lousydeal.com` each answer `302`
to Cloudflare Access for an unauthenticated request. **Deploying is not
publishing**, and nothing here has been published.

`deploys/lousydeal/` carries the base and both overlays; images are promoted by
digest.

## Deferred ideas

None recorded. When there is one, it goes to `docs/working/backlog.md` rather
than quietly into V1 scope (§25).
