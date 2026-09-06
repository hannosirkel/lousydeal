# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not.

| | |
| --- | --- |
| Updated | 2026-09-06 |
| Current slice | **LD-02 — Certificates**, planned, not started. LD-01 closed by the operator 2026-09-06; LD-09 complete. |
| Next action | Execute [`ld-02-certificates.md`](./ld-02-certificates.md) from `C1`. Two operator items below run alongside it. |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Next action, in full

**LD-01 was closed by the operator on 2026-09-06** and **LD-09 is complete** —
sixteen rows, `V0` to `V15`, merged as pull requests 71 to 83 in this repository
and 35 in `deploys`. The plan and its record are
[`ld-09-visual-identity.md`](./ld-09-visual-identity.md).

**LD-02 is the current slice**, planned in
[`ld-02-certificates.md`](./ld-02-certificates.md): sixteen rows across three
repositories, issuing a deal for a real order, addressing it at
`/done-deals/{slug}`, rendering it as a page and a vector PDF, and sending the
§ 55 confirmation the publication gate is waiting on. The transactional mail
credentials were supplied on 2026-09-06 and are held in the operator's key
store; they reach OpenBao in `C11` and no repository.

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
every page and working with scripting off. What it cannot do is send the
§ 56⁴(4) receipt, because nothing here sends email — which is LD-02's, and is
the same reason item 11 is open.

### 2. Six merchant values in the private inventory

**Not secrets, and not OpenBao.** §2b's open decision was settled on 2026-09-06
and the answer is the reference project's: the trader identity is injected by
Orange's Application from `argocd_lousydeal_environments[*].merchant`, whose
committed values are placeholders and whose real values live in the operator's
private Ansible inventory.

So the remaining action is: put the real six — legal name, address, email,
telephone, registry code, VAT number — under that key in the private
`orange.yml`. Until then both environments render `Example Trader OÜ` and the
rest of the placeholders.

`deploys/lousydeal/base/storefront.yaml` carries the real values as a fallback
the patch supersedes, for the reason `deploys/plepic`'s does: a manifest applied
without Orange should still publish a lawful imprint rather than a page of gaps.

**The imprint is complete either way.** Verified 2026-09-06: served from a built
server with all six configured, it renders no gap and no incompleteness notice —
the first time that has been true.

### What LD-02 still needs from the operator

Named in full in that plan's `OWNER MUST FILL`. The blocking one is the SMTP
submission host, port, TLS servername and destination CIDR for each environment.
Those are inventory values, not secrets, and they belong in the private
`orange.yml` beside the merchant block above — `C10` and `C11` cannot be
verified against a running deployment without them.

## Operator items

What is actually held, as against what the contract expects in §2b.

| Item | Held | Note |
| --- | --- | --- |
| Domain `lousydeal.com` | yes | DNS not yet published |
| Company identity, Aislopica OÜ | yes | §2b |
| Stripe test-mode keys | yes | `.keys/stripe-lousydeal-test` in the Orange checkout, provider-first per `006` |
| Merchant identity in the private `orange.yml` | **no** | placeholders render until it is there; §2b settled 2026-09-06, and these are inventory values rather than secrets |
| Stripe live keys | no | not before the publication gate, by design |
| Printful account and sandbox | no | request before LD-04 |
| SMTP transactional credentials | **yes** | supplied 2026-09-06, live and test; in the Orange key store, seeded to OpenBao by `C11` |
| SMTP submission host, port, servername and destination CIDR | **no** | inventory values, per environment; blocks `C10` and `C11` from being verified against a deployment |
| Cloudflare Access policy for `test.lousydeal.com` | yes | measured 2026-09-05: all three hostnames answer 302 to Access |

The runtime credentials the deployment reads are seeded; the two merchant
fields above are not. The path is §2b, step 1 to 6.

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
