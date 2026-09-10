/**
 * Take one line back out of the cart.
 *
 * **A word, not an icon.** `brand.md` §6 forbids icons outright — "no icon,
 * illustration, mascot or photograph" — and the word is the better control
 * anyway: a bin glyph beside a shirt costing real money is a guess the buyer
 * has to make, while "Remove" is what it does. `MerchForm` records the same reasoning for
 * naming the item in the accessible name of its own controls, and it applies
 * with more force to a destructive one.
 *
 * **Its own element rather than a quiet `Button`.** `Button` offers `primary`
 * and `secondary`, both of which are the weight of the thing they sit beside;
 * this belongs to a line in a ledger and must not compete with the price. A
 * third variant on a shared component for one caller is a wider API than the
 * problem, so the style lives here.
 *
 * **A `<form>`, not a link**, because it changes something. A GET that empties
 * a cart line is a GET a prefetcher can fire.
 */

export interface RemoveLineProps {
  readonly action: (formData: FormData) => Promise<void>;
  readonly lineId: string;
  /**
   * The line this acts on, named in the accessible name.
   *
   * A cart of four printed things otherwise offers four controls all called
   * "Remove", which is a list a screen-reader user cannot choose from.
   */
  readonly title: string;
  readonly label: string;
}

export function RemoveLine({ action, lineId, title, label }: RemoveLineProps) {
  return (
    <form action={action} className="remove-line">
      <input type="hidden" name="lineId" value={lineId} />
      <button className="remove-line-button" type="submit" aria-label={`${label} ${title}`}>
        {label}
      </button>
    </form>
  );
}
