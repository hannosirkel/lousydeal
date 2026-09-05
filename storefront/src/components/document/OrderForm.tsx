/**
 * The one control that starts a purchase, in one place.
 *
 * Both the offer block and every table row post the same thing, and the hidden
 * `variantId` is the whole of what the server action reads
 * (`src/app/page.tsx`'s `addToCart`). Having one component render it means the
 * field name is written once, and means a test can assert it: the page itself
 * is an async Server Component and cannot be rendered outside a request.
 *
 * **The accessible name carries the tier.** Three table buttons reading only
 * `ACQUIRE` are three identical entries in a screen reader's controls list for
 * three different prices. `for` names the tier without putting a second copy
 * of the price in the visible markup — the row already has a price column.
 */

import { Button } from "./Button";

export interface OrderFormProps {
  /** The Server Action the page defines; this component never defines one. */
  readonly action: (formData: FormData) => Promise<void>;
  readonly variantId: string;
  /** What a sighted reader sees on the control. */
  readonly label: string;
  /** Appended to the accessible name only, when the visible label is ambiguous. */
  readonly forTier?: string;
}

export function OrderForm({ action, variantId, label, forTier }: OrderFormProps) {
  return (
    <form action={action}>
      <input type="hidden" name="variantId" value={variantId} />
      <Button type="submit">
        {label}
        {forTier === undefined ? null : <span className="visually-hidden"> {forTier}</span>}
      </Button>
    </form>
  );
}
