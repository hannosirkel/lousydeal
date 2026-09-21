# Provider reporting and social operations

This document records the current, deployed operating contract for Meeme's
reports, social drafts and campaign-media uploads. LD-10 introduced the
contract and closed on 2026-09-21.

## Trust boundary

Meeme calls one authenticated, TLS-pinned n8n workflow. It does not hold a
Buffer, Google Analytics, Medusa, database, storage or n8n administration
credential. The workflow exposes fixed actions and returns public aggregate
data only.

Callers cannot choose an account, property, metric, date range, query, path,
cursor or provider identifier. Provider failures are reduced to a fixed status
vocabulary; raw errors and private identifiers remain operator-private. The
workflow retains no execution payloads.

## Reports

The three report actions cover the preceding seven completed days in the bound
`Europe/Tallinn` timezone:

| Action | Source | Result |
| --- | --- | --- |
| `commerce-summary` | the aggregate-only Medusa route | paid-order count, gross, refunds, net, certificates and merch units, separated by currency |
| `analytics-summary` | the GA Data API | consented active users, sessions and the fixed funnel events |
| `social-summary` | Buffer | allow-listed aggregate metrics for one exact owned channel alias |

Every report distinguishes `available`, `empty`, `incomplete` and
`unavailable`; zero is never used to disguise a failed provider. Commerce is
authoritative for paid orders and money. GA is consented analytics and can
legitimately differ from commerce.

The commerce route accepts no query parameters, requires the dedicated report
key through `x-meeme-report-key`, and returns no customer, email, address,
inscription, order, cart, payment or card identifier. Amounts are integer minor
units. Captures belong to their capture day and refunds to their refund day.

## Campaign media and Buffer drafts

The media action accepts one JPEG, PNG or MP4 file no larger than 8 MiB. n8n
uploads it beneath the fixed campaign prefix in the dedicated public staging
bucket and returns one stable HTTPS URL. Authorization and temporary upload
tokens remain inside credential-aware workflow nodes. Meeme validates the same
bound origin and prefix when that URL is used for a draft.

Instagram, TikTok and X are connected, posting-authorized and automatic.
Facebook, LinkedIn and YouTube are unavailable. Draft creation never publishes,
schedules, replies, moderates or sends direct messages. Deleting a verification
draft remains an operator action in Buffer; Meeme deliberately has no delete
action or direct Buffer credential.

The dedicated B2 application key has one-bucket staging authority. The operator
accepted that provider-side scope for disposable campaign media; Meeme's
reviewed interface remains upload-only and prefix-bound.

## Runtime and recovery

GA, commerce and media enable independently through private runtime bindings.
Disabling one returns the fixed unavailable response for that action without
disturbing the other reports, Buffer drafts or either store. Credentials follow
the ignored-source, OpenBao and narrow runtime-projection lifecycle; no value or
live private identifier belongs in this repository.

Recover a provider by disabling only its binding, replacing the credential
through that lifecycle, reconciling the reviewed workflow or workload, and
repeating the fixed safe probes. Storefront artifacts remain promoted by
digest. Test ordering stays enabled on Stripe sandbox behind Cloudflare Access;
live remains public and open.

## LD-10 acceptance record

The final runtime verification found the storefront and all six workloads
healthy. Desktop and mobile browser checks covered the favicon, three social
links, cart and merch control spacing, Stripe disclosure and embedded card
frames without application errors. No payment was submitted during this check.

The reports returned the real paid commerce aggregate and distinct empty GA and
Instagram results for the same seven completed Tallinn dates. Wrong-key,
arbitrary-selector, provider-outage and disabled-provider checks returned the
bounded refusal states. The approved PNG upload returned a stable public URL
whose direct response matched its media type and length.

One private Instagram draft and one private TikTok draft were created from that
asset without scheduling or publication. The operator deleted the verification
drafts on 2026-09-21. The post-activation commerce-key rotation passed all safe
probes; after that confirmation the operator authorized and completed removal
of the inactive local rollback copy.
