# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not.

| | |
| --- | --- |
| Updated | 2026-09-05 |
| Current slice | LD-09, visual identity and legal documents. All sixteen rows merged; Gate E run 2026-09-05. |
| Next action | **The operator's, not an agent's.** Two of them, below, and neither is code. |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Next action, in full

**LD-01 is closed** and **LD-09 is complete** — sixteen rows, `V0` to `V15`,
merged as pull requests 71 to 83 in this repository and 35 in `deploys`. The
plan and its record are [`ld-09-visual-identity.md`](./ld-09-visual-identity.md).

Nothing in this initiative is waiting on an agent. Two things are waiting on the
operator, and they are not the same kind of thing.

### 1. The legal gate (§23)

**Eighteen items** are recorded in the gate list at the foot of
[`ld-09-visual-identity.md`](./ld-09-visual-identity.md), and §23 makes closing
them an operator gate that a qualified human reader closes. Four documents are
drafted and every provision in them is cited to the redaction of the Law of
Obligations Act in force on 2026-09-05; that is drafting, not advice, and this
initiative does not treat it as advice.

Three of the eighteen are worth naming here because they are not questions of
wording:

- **No § 56⁴ withdrawal button exists.** In force since 01.09.2026, and a build
  task rather than a copy one.
- **LD-02 is a hard precondition for publishing.** Without the § 55 confirmation
  the digital-content exception's third condition is never met, so the 14-day
  right stands for every order — which every surface now says.
- **Stripe's `__stripe_mid` is a 365-day device identifier** set under this
  site's own domain. The privacy notice states the position taken and does not
  pretend the ePrivacy question is settled.

### 2. Two secrets, and the imprint is incomplete until they exist

`MERCHANT_REGISTRY_CODE` and `MERCHANT_VAT_NUMBER` are declared on the
storefront in both environments as optional `secretKeyRef`s, per §2b: they may
not be committed, and this repository and `deploys` are both public. **Until
they are in OpenBao, the imprint renders each as a named, visible gap and says
the document is incomplete** — designed behaviour, and still a visible gap.

Everything else §2b lets us commit is committed and resolves in both
environments, verified by rendering the overlays.

### Not this initiative's to schedule

LD-02 is the next slice and has no plan yet. It carries the order confirmation
email, the certificate at `/done-deals/{slug}`, the inscription field, and the
public counter — the four largest items in LD-09's deferrals table.

## Operator items

What is actually held, as against what the contract expects in §2b.

| Item | Held | Note |
| --- | --- | --- |
| Domain `lousydeal.com` | yes | DNS not yet published |
| Company identity, Aislopica OÜ | yes | §2b |
| Stripe test-mode keys | yes | `.keys/stripe-lousydeal-test` in the Orange checkout, provider-first per `006` |
| Registry code and VAT number in OpenBao | **no** | the imprint is incomplete in both environments until they are; §2b forbids committing either |
| Stripe live keys | no | not before the publication gate, by design |
| Printful account and sandbox | no | request before LD-04 |
| SMTP transactional credentials | no | request before LD-02 |
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
