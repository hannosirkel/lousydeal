/**
 * What the recipient of a gift reads.
 *
 * **This is not a confirmation and must never read like one.** LD-03's
 * constraint 5: the recipient gets a certificate, not a contract. They did not
 * buy anything, they hold no right of withdrawal, and § 55(2)'s § 54(1) recital
 * belongs to the buyer. A message that recited a right this reader does not
 * have would be worse than saying nothing — it would invite them to try to
 * exercise it.
 *
 * So this carries four things and no more: what arrived, who it is from if the
 * buyer said, what the buyer wrote if they wrote anything, and where to look at
 * it. Everything else in `confirmation.ts` stays where it belongs.
 *
 * **The premise line states the amount**, settled by the operator on
 * 2026-09-07 against §6's own suggestion. `Someone spent $5.00 on absolutely
 * nothing for you.` It is the product's whole joke and the recipient is the
 * person it is on; a gift message that hid the price would be protecting the
 * buyer from a punchline they paid for.
 *
 * **It names no price the recipient could act on.** There is no link to buy
 * one, no discount, no referral. §6 asks for a gift flow, not a growth loop,
 * and this is a message to somebody who did not ask to hear from us.
 */

/**
 * The subject. It says who it is from where the buyer gave a name, because an
 * unattributed message from a domain nobody recognises is a message that gets
 * deleted — and the certificate would go unread through no fault of the buyer.
 */
export const GIFT_SUBJECT = (senderName: string | null): string =>
  senderName === null ? "Somebody bought you a lousy deal" : `${senderName} bought you a lousy deal`;

export const GIFT_HEADINGS = {
  opening: "Somebody bought you a lousy deal",
  message: "They said",
  what: "What it is",
  /** Only rendered when the order carries printed goods. LD-11 F2. */
  parcel: "Also on its way",
  keep: "It is yours",
  notice: "Why you got this, and what we hold",
  trader: "Who sent it",
} as const;

export const GIFT_LABELS = {
  certificate: "Your certificate",
  serial: "Number",
  issued: "Issued",
} as const;

/**
 * The premise line, as the operator wrote it.
 *
 * **`{amount}` is the certificate's own figure, and not the order total.** It
 * used to be the same string the buyer's confirmation prints; LD-11 F1 stopped
 * that, because an order can carry a parcel and live order #1's recipient read
 * `$41.40` above a link to a certificate saying `$6.00`. This sentence sits
 * directly above that link, so the figure in it has to be the figure on the
 * document it introduces. The buyer's own total belongs in the buyer's
 * confirmation, where § 55(2) itemises it.
 *
 * Still formatted once by the process that sends it, for the reason `money.ts`
 * gives about two runtimes carrying different ICU data.
 */
export const GIFT_OPENING = "Someone spent {amount} on absolutely nothing for you.";

/**
 * Said where the recipient can act on it, which is immediately.
 *
 * The certificate is the whole of what exists. There is no account to make, no
 * file to download, nothing to claim and nothing that expires — and saying so
 * is what stops a reader waiting for a second email that is never coming.
 */
export const GIFT_WHAT = [
  "It is a numbered certificate recording that somebody paid for nothing on your behalf. That is the entire product; there is no catch and there is nothing else coming.",
  "There is nothing to claim, no account to create and nothing to install. The link below is the certificate, and it will keep working.",
] as const;

/**
 * The same thing to say when a parcel *is* coming.
 *
 * **LD-11 F2.** `GIFT_WHAT`'s "there is nothing else coming" was true while a
 * gift order could only ever be a certificate. LD-04 made an order able to
 * carry a parcel, and on 2026-09-19 that sentence went to a recipient with a
 * trucker cap already in the post to their own address — the only line in this
 * repository's mail that was simply false.
 *
 * The claim is narrowed rather than deleted: for a certificate-only gift it is
 * still what stops a reader waiting for a second email that never comes, so
 * `GIFT_WHAT` keeps it and this variant is used only when there is something
 * else to say. The second line is shared — it is about the certificate and is
 * true either way.
 */
export const GIFT_WHAT_WITH_PARCEL = [
  "It is a numbered certificate recording that somebody paid for nothing on your behalf. That is the entire product, and there is no catch.",
  GIFT_WHAT[1],
] as const;

/**
 * What is in the post, and where it is going — never the address itself.
 *
 * **The destination is named as a country and nothing finer.** The recipient
 * knows their own address; printing it back tells them nothing and puts a
 * third party's street into an email this deployment also logs and stores,
 * which is what LD-03's constraint 2 and its data-minimisation constraint
 * exist to prevent. The country is enough to make the sentence concrete and
 * carries nothing the recipient did not already supply to the buyer.
 *
 * **It says the parcel needs nothing from them.** Order #1's recipient was
 * told nothing was coming, so they had no reason to expect or collect a
 * parcel; the failure this repairs is a person not knowing to look out for
 * something, not a person wanting a tracking number.
 *
 * **The country may be absent and the section still runs.** If the address
 * carries no readable country the parcel is still named, because the sentence
 * this row exists to remove is the one that denies it — falling back to
 * silence would put "there is nothing else coming" back in front of somebody
 * with a hat in the post.
 */
export const giftParcel = (items: readonly string[], country: string | null): readonly string[] => [
  country === null
    ? `${items.join(", ")} — in the post to you.`
    : `${items.join(", ")} — posted to you in ${country}.`,
  "The certificate above confers nothing; this is a real thing in the post. It needs nothing from you, and we are not printing your address here.",
];

/**
 * What this message is not.
 *
 * **The one sentence that names the buyer's position without describing it.**
 * A recipient who wants a refund has to go to the person who paid, because
 * they are the only one with a contract. Telling them that here is cheaper
 * than the support message, and it is true without reciting a single right
 * they do not hold.
 */
/**
 * The Article 14 notice, and the identity behind it.
 *
 * **G4 left this out and G7 found it.** That row built a message that took the
 * trader identity as an argument and used it only as a null-guard, so the
 * recipient received an unsigned message from an unidentified controller. GDPR
 * Article 14(1)(a) requires the controller's identity, and Article 14(3)(b)
 * requires the information at the latest at the first communication — which
 * this message is. A message that named nobody also simply reads like spam.
 *
 * **The position, stated so a reader can disagree with it.** The full
 * Article 14(1)–(2) list is longer than this message should be, so it is given
 * here in outline and in full at `{siteBaseUrl}/legal/privacy`, which §6 of
 * that policy addresses to this reader specifically. Article 12(1) permits
 * that: the information must be accessible, not exhaustively recited in the
 * first sentence. Whether that is the right reading is §23's question and not
 * this file's.
 */
export const GIFT_NOTICE = [
  "We have your address, and your name if they gave one, because the person who bought this typed them in. We used them to send you this, and for nothing else. You are not on a list and we will not write to you again.",
  "You can ask what we hold, have it corrected or deleted, or object. Write to {merchantEmail}. What we keep and for how long is at {siteBaseUrl}/legal/privacy — §6 there is for you, not for the buyer.",
] as const;

/** Who sent it. Article 14(1)(a), and the difference between a message and spam. */
export const GIFT_TRADER = [
  "{merchantLegalName}, {merchantAddress}",
  "Registry code {merchantRegistryCode} · VAT {merchantVatNumber}",
  "{merchantEmail} · {merchantPhoneNumber}",
] as const;

export const GIFT_KEEP = [
  "Nobody will ask you for anything. We have your address because the person who bought this typed it in, we used it to send you this, and we are not going to write to you again.",
  "If something is wrong with it, the person who bought it is the one who can sort it out with us — they made the purchase and we deal with them.",
] as const;
