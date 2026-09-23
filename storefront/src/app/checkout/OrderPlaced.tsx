import type { ReactElement } from "react";

import { ORDER_PLACED_HEADING, orderPlacedLines } from "../../content/checkout";

/**
 * Where the checkout ends. LD-11 H1.
 *
 * **Its own module so the suite can render it**, for `GiftAddressNote`'s
 * reason: the state that reaches it — a completed order — cannot be reached
 * by rendering `PayButton` without a DOM. It renders what `orderPlacedLines`
 * returns, so there is no second copy of the copy.
 *
 * `role="status"` because the form it replaces had focus a moment ago, and a
 * screen reader would otherwise announce nothing when it disappears.
 */
export function OrderPlaced({
  email,
  giftRecipientEmail,
  hasPostedGoods,
}: {
  readonly email: string;
  readonly giftRecipientEmail: string | null;
  readonly hasPostedGoods: boolean;
}): ReactElement {
  return (
    <section role="status">
      <h2>{ORDER_PLACED_HEADING}</h2>
      {orderPlacedLines({ email, giftRecipientEmail, hasPostedGoods }).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  );
}
