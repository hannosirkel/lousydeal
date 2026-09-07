# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not.

| | |
| --- | --- |
| Updated | 2026-09-07 |
| Current slice | **LD-03 — Gifting**, planned, not started. LD-02 complete 2026-09-07; LD-01 closed by the operator 2026-09-06; LD-09 complete. |
| Next action | Execute [`ld-03-gifting.md`](./ld-03-gifting.md) from `G1`. The legal gate below is unchanged and is still the operator's. |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Next action, in full

**LD-03 is the current slice**, planned in
[`ld-03-gifting.md`](./ld-03-gifting.md): nine rows in `lousydeal` only, letting
a buyer pay for a certificate somebody else receives. No `deploys` or `orange`
change — it adds no secret, no environment value and no network destination, and
reuses the mail transport LD-02 built.

**Two decisions were settled by the operator on 2026-09-07 before planning.**
The recipient's name does not appear on the public certificate — the public
fields stay §5's `display_name` and `dedication`, which the buyer types about
themselves. And a buyer's withdrawal does not automatically revoke a gift
certificate; the § 56⁴(4) receipt reaches a person who decides.

**The sharpest open question is G7's.** A gift means processing a third party's
name and address, supplied by somebody else, to send one message. GDPR
Article 14 requires informing a data subject whose data was not obtained from
them; Article 14(5) exempts disproportionate effort, and whether the gift
message is itself that notice is arguable. The row states the position and
cites the provisions; §23 reserves whether it is right to the operator and a
qualified human reader.

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

**One acceptance item is the operator's and cannot be automated.** C15 sent two
§ 55 confirmations and one § 56⁴(4) receipt to a real address. Whether they
arrived, are readable, and landed in an inbox rather than a spam folder is a
human judgement — and the DKIM signature, which only the received copy shows,
is part of it.

## Operator items

What is actually held, as against what the contract expects in §2b.

| Item | Held | Note |
| --- | --- | --- |
| Domain `lousydeal.com` | yes | DNS not yet published |
| Company identity, Aislopica OÜ | yes | §2b |
| Stripe test-mode keys | yes | `.keys/stripe-lousydeal-test` in the Orange checkout, provider-first per `006` |
| Merchant identity in the private `orange.yml` | **yes** | added 2026-09-07 while deploying `C11`; the test environment renders `Aislopica OÜ` |
| Stripe live keys | no | not before the publication gate, by design |
| Printful account and sandbox | no | request before LD-04 |
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
