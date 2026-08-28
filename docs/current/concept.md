# Lousy Deal

**The worst deal of your life. On purpose.**

The product concept. What is actually being built first, and in what order, is
[`docs/working/fresh-build.md`](../working/fresh-build.md); where the two
disagree about scope, that document wins.

**LousyDeal.com** is a novelty ecommerce concept built around an intentionally
terrible transaction: customers knowingly pay money for almost nothing, receive
an official certificate proving they made a lousy deal, and are encouraged to
make the deal even worse through upgrades, gifts, merch, and absurd enterprise
licensing.

The premise is simple enough to understand in seconds and weird enough to share.

## The product

Customers choose how lousy they want their deal to be:

* **Lousy Deal — $5.** Official numbered digital certificate.
* **Lousy Deal Plus — $10.** Essentially the same thing, but with a Plus label.
* **Lousy Deal Pro — $25.** Same underlying value, now presented with
  professional-grade poor judgment.
* **Lousy Deal Enterprise — annual subscription.** Available only by negotiating
  with Baldrick. A one-year certificate license and one year of support,
  assuming Baldrick has time. **Deferred: not in the first version.** Medusa has
  no subscription engine, so Enterprise is a build of its own rather than a tier
  alongside the other three.

The more a customer pays, the worse the value proposition becomes. That is the
product.

## Baldrick

**Baldrick** is the site's deliberately unhelpful sales and support chatbot.

He looks and behaves like a conversational assistant but runs entirely on
predefined flows, rules, keyword matching, and scripted responses. He has no
LLM backend and is not to be given one.

Baldrick can explain licensing, handle complaints and support questions, offer
"discount codes" that increase the price, unlock otherwise unavailable products,
misunderstand customers in entertaining ways, and generally make an already
lousy deal worse.

> **Customer:** Can I get a discount?
>
> **Baldrick:** Certainly. I've applied BALDRICK20. Your price is now 20% higher.

## Viral mechanics

Every transaction produces something customers can show other people:

> **Lousy Deal #18,421**
>
> **$25 wasted**
>
> **Certified Poor Judgment**

Public certificate pages, numbered deals, social share cards, a global "money
wasted" counter, and gift purchases turn the purchase itself into shareable
content. The counter reports real orders; nothing on the site fabricates a
customer, a total, or a review.

A certificate never carries the buyer's billing name. It carries what the buyer
chose to type at checkout, knowing it would be public.

The **gift option** matters most:

> Someone spent $10 so you could receive almost nothing.

The recipient receives their own Lousy Deal certificate, which is a referral
loop that costs nothing to run.

## Merch

After making a lousy deal, customers are invited to make it worse. Three
Printful-powered upsells, and deliberately no more:

* **T-shirt** — "I made a lousy deal and all I got was this overpriced T-shirt"
* **Mug** — "Lousy Deal Pro — Certified Poor Judgment"
* **Sticker** — a low-cost impulse add-on

Merch stays secondary to the concept rather than turning the site into a
conventional apparel shop.

## Why it might work

Lousy Deal is not primarily a $5 ecommerce product. It is an **internet joke
with a payment mechanism**.

The appeal comes from an instantly understandable premise, a memorable `.com`,
very low marginal cost, giftability, shareable proof of purchase, absurdly
polished corporate presentation, and effectively endless room for new jokes.

The story gets stronger as the counter grows:

> **10,000 people have voluntarily spent $73,000 making lousy deals.**

## Technology

Medusa, Next.js, Stripe, PostgreSQL, Printful — the `plepic` stack, reused for
payments, email, orders, deployment and fulfilment. The store is technically
independent of Plepic Games.

The custom surface is small: certificate generation, public deal pages, gifting,
Baldrick, intentionally bad discount mechanics, and the counters.

## Brand rule

Every new feature should satisfy one test:

**Does this give the customer another entertaining opportunity to make their
deal worse?**

If yes, it belongs on LousyDeal.com.
