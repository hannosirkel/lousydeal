/**
 * The control that adds a printed thing, with its size.
 *
 * **A `<select>` and not five buttons.** A shirt has five sizes and four rows
 * of five controls is twenty controls in a screen reader's list, all reading
 * `ADD`. One select per row names what it is choosing.
 *
 * **No `<select>` at all where there is one size.** A control with a single
 * option is a control that does nothing, which `brand.md` calls a lie; the
 * hidden field carries the only variant there is, exactly as `OrderForm` does
 * for a tier.
 *
 * It does not share `OrderForm`, and that is deliberate rather than
 * duplication: the two post to different actions, and P9b's whole finding was
 * that "add a certificate" and "add a thing" had been made the same operation
 * once already.
 */

import { MERCH_ADD_LABEL, MERCH_SIZE_LABEL } from "../../content/merch";
import { STORE_CLOSED_NOTICE } from "../../content/checkout";
import { Button } from "./Button";

export interface MerchFormProps {
  readonly action: (formData: FormData) => Promise<void>;
  /** The item's name, for the accessible name of both controls. */
  readonly title: string;
  readonly variants: readonly { readonly variantId: string; readonly size: string }[];
  readonly storeOpen: boolean;
}

export function MerchForm({ action, title, variants, storeOpen }: MerchFormProps) {
  if (!storeOpen) return <p className="notice">{STORE_CLOSED_NOTICE}</p>;
  const only = variants.length === 1 ? variants[0] : undefined;
  const selectId = `merch-size-${variants[0]?.variantId ?? "none"}`;

  return (
    <form action={action} className="merch-form" data-analytics-event="merch_added">
      {only === undefined ? (
        <>
          {/* Labelled by the item, not by the word "Size" alone: four selects
              all called Size are four identical entries in a controls list. */}
          <label className="visually-hidden" htmlFor={selectId}>
            {MERCH_SIZE_LABEL}, {title}
          </label>
          {/* **Empty first, so a size is chosen rather than defaulted.** This
              opened on the first variant, so a buyer who pressed ADD without
              touching the select had ordered a Small with no moment of choice
              -- and a shirt in the wrong size is a return, which the operator
              pays the postage on. `required` was already here and did nothing,
              because a select with a value always satisfies it; with an empty
              option it makes the browser refuse the submission, scripting off
              included. */}
          <select id={selectId} name="variantId" defaultValue="" required>
            <option value="" disabled>
              {MERCH_SIZE_LABEL}
            </option>
            {variants.map((variant) => (
              <option key={variant.variantId} value={variant.variantId}>
                {variant.size}
              </option>
            ))}
          </select>
        </>
      ) : (
        <input type="hidden" name="variantId" value={only.variantId} />
      )}
      <Button type="submit">
        {MERCH_ADD_LABEL}
        <span className="visually-hidden"> {title}</span>
      </Button>
    </form>
  );
}
