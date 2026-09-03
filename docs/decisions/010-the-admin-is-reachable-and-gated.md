# 010. The Medusa Admin is reachable, gated at the edge

- **Date:** 2026-09-03
- **Status:** accepted
- **Amends:** the Target exposure table in
  [`ld-01-foundation.md`](../working/ld-01-foundation.md)

## Context and problem statement

LD-01 was written with two exposure lines that this decision reverses:

| Surface | Was |
| --- | --- |
| `lousydeal.com` | nobody in this slice |
| Medusa Admin | no public hostname, in any encoding, never in LD-01 |

The second was not incidental. `deploys/lousydeal/base/service.yaml:24` gives the
backend Service **no `externalIPs`**, unlike the reference's, and
`base/networkpolicy.yaml:30-31` states that *"even a WireGuard-attached
administrator has no ingress path to this pod at all in this plan"*. T13a's
review then recorded a trap that follows from it: Orange's Application template
patches `replace /spec/ingress/0/from`, and this policy's index 0 is the
storefront's pod selector rather than the reference's CIDR, so the reference's
patch shape must not be rendered here.

The operator has decided the Admin should be reachable, gated behind Cloudflare
Access and authenticated to one Google identity — the same posture the reference
uses for `admin.plepicgames.com`.

## Decision

**The Admin gets a public hostname, and it is reachable only through Cloudflare
Access.** The apex and `www` likewise resolve, to the storefront.

Nothing is reachable without authenticating. The hostname is never live before
its Access application exists: `scripts/cloudflare-add-web` creates the identity
provider, the application and the policy, and only then the proxied CNAME.

## Rationale

An Admin nobody can reach is an Admin nobody can operate. LD-01 deferred the
question rather than answering it, and the deferral has now cost real work: the
publishable key could only be minted by port-forwarding from the cluster host,
because there was no other way to reach the Admin API.

The reference already runs this posture. Copying it is a smaller step than
inventing a second one.

## What this costs, and why it is not a DNS change

The backend has **no route to reach**. Making the Admin reachable requires an
`externalIPs` entry, a port allocation on the one shared WireGuard address, and
a NetworkPolicy rule admitting it — in `deploys` — before any tunnel route or
Access application can point anywhere.

**The NetworkPolicy rule is the delicate part**, and T13a's recorded trap says
why: a rule added at index 0, or a template patch that replaces index 0, deletes
the storefront's only ingress path and substitutes a CIDR with a route to
`backend:9000`. Any rule added here goes after the existing one, and the
Application template must still not render `replace /spec/ingress/0/from`
against `allow-backend-ingress`.

## Consequences

- The Target exposure table is amended: `lousydeal.com` and the Admin become
  reachable-behind-Access rather than unreachable.
- **The Admin's exposure is now one Access policy deep.** A misconfigured or
  bypassed policy exposes an authenticated commerce Admin, which is a larger
  blast radius than the storefront.
- `deploys/lousydeal/base/networkpolicy.yaml:30-31` and `service.yaml:24` are
  falsified by this decision and are corrected by the row that implements it.
- The legal gate still precedes publication. Resolving is not publishing.
