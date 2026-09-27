# User-experience candidates

Eight changes that would make the shop clearer to a buyer. Each came from a
live walk of the store, and none was selected when the build closed. See [the
issues index](./README.md) for how to take one up.

These came from the LD-11 user-experience audit, which walked the live store
on 2026-09-22, mostly at 390 pixels and, for some flows, also at 1280. The operator delegated the selection to
TypeSafe's Jev model, with a bar of a success probability above 0.80. These
candidates did not clear it. The letter is the audit's identifier, and some
code comments cite it.

| Id | What it does | Why | Jev |
| --- | --- | --- | --- |
| `m` | State the total, or state that it is not known yet, before the consent and the pay control. | On a parcel cart, `TOTAL` is a sentence until the address is complete. The page asks for the consent and shows `ORDER WITH OBLIGATION TO PAY` before it shows the amount. No card field exists before the address is complete, and nothing says why. | 0.80 |
| `t` | Make Baldrick's fallback list the topics that he actually answers. | The fallback says that he knows about "the certificate, gifts, refunds and complaints". He also answers eight other intents, for example licensing and support. A visitor who reads the list can conclude that he cannot help. The text is in `storefront/src/content/baldrick.ts`. | 0.74 |
| `a` | Decide if merch is a browse path or cart-only. Then build and link a `/goods` index, or remove the product pages from `sitemap.xml`. | `/goods` is a 404. No page links to a product page until the cart holds something. But `sitemap.xml` lists the product pages, so search can bring a visitor to a page the shop later refuses to sell from alone. | 0.73 |
| `p` | Link the certificate PDF from the certificate page, the order confirmation, or both. | The PDF is one of the two certificate URLs that [`specification.md` §5](../current/specification.md) fixes. No page and no email links to it. An owner finds it only if they add `/certificate.pdf` to the URL. | 0.72 |
| `c`+`v` | Stop money figures and product names wrapping in the narrow value column at 390 pixels. | The cart ledger shows `$6.00` as `$6.0` and `0` on two lines. The checkout ledger wraps `$29.00` the same way. At 1280 pixels nothing wraps. The audit found one cause, the value column's width, on two pages. Jev scored the merged change at 0.70, and the cart fix alone at 0.52. | 0.70 |
| `g` | Give the visitor a link back to the cart. | Only the checkout has a link to `/cart`; adding an item also goes there. A visitor who leaves the cart for a deal page must add another item or type the URL to return. | 0.68 |
| `d` | Widen the upsell's item column at 390 pixels. | Every multi-word product name wraps over three or four lines. `Certified Worthless` also breaks inside a word. Measure first: this can have the same cause as `c`+`v`. | 0.58 |
| `e` | Give each commerce page its own `<title>`. | `/`, `/deal/*`, `/goods/*` and `/cart` all show `LOUSYDEAL.COM`. Two open tiers show two tabs with the same name. The legal pages already have their own titles. | 0.42 |
