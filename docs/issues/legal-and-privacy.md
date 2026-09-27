# Legal and privacy

Gaps between what the legal documents say and what the shop records or does.
See [the issues index](./README.md) for how to take one up.

- **Four changes to the legal text came after the gate accepted it.**
  [Decision 016](../decisions/016-v1-gate-acceptances.md) lists them. The two
  privacy changes, which added Google Analytics and Meta Pixel, have no
  recorded authority. The operator decides whether to accept them, and a
  decision records it.
- **No record shows the analytics account settings were read back.**
  [`operations.md`](../current/operations.md) lists the settings that code
  cannot set. A probe on 2026-09-12 saw Google send an automatic `scroll`
  event. Read the settings back and record the vendors' retention periods.
- **The privacy notice promises to remove an address on request, and no
  command does it.** A buyer's or a gift recipient's address stays on the
  order record. Removing it today is a manual database change.
