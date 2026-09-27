# Deferred features

Features the build left out on purpose. None is a defect; each needs an
operator decision before it becomes work. See [the issues index](./README.md)
for how to take one up.

The [specification](../current/specification.md) lists what the build left
out on purpose. None of it is built.

- **Accounts and order lookup** (§12). The confirmation email is the only copy
  of a certificate link.
- **The §25 non-goals and the §26 future ideas**, for example Lousy Deal of
  the Month, physical certificates, social leaderboards, corporate bulk
  purchases, a public API and scheduled gift delivery.
- **Enterprise (LD-07).** An annual certificate licence that a buyer unlocks
  by negotiating with Baldrick. It needs subscription billing, entitlement,
  expiry and renewal, which Medusa does not provide. The design is in
  [`specification.md` §10](../current/specification.md). §26 keeps the
  current code compatible with it.
