# Operations and performance

Load, data-model and operator-visibility problems in how the shop runs. See
[the issues index](./README.md) for how to take one up.

- **The storefront readiness probe renders the home page every five
  seconds.** Each probe costs three Store API reads, on the live store and the
  test store, whether or not anybody visits. A probe path that renders nothing
  removes them. The probe is in `deploys/lousydeal/base/storefront.yaml`, so
  the change is in the `deploys` repository.
- **The region is read twice** on the checkout page (through `listTiers`, then
  `getDefaultRegion`), and when `addToCart` creates a new cart (through
  `listTiers`, then `cartToAddTo`). `listCatalogue` removed the same waste
  from the cart page and the sitemap.
- **The notification provider sends to one recipient, with no CC.** The
  operator ruled it out of LD-11's scope on 2026-09-19.
- **Merch orders never get a Medusa fulfilment, and `order.status` stays
  `pending`.** The Printful provider's `createFulfillment` records what Medusa
  needs, and nothing calls it. Admin shows every merch order as unfulfilled,
  and only the shop's own `printful_submission` table holds the tracking
  number. An operator cannot tell a shipped order from a stalled one in
  Admin.
