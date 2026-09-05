/**
 * Rectangular, 1px border, hover inverts ground and text.
 * `docs/current/brand.md` §3.
 *
 * **A link is an `<a>` and an action is a `<button>`.** The `href` prop
 * decides which, rather than a `variant` that could style one as the other: a
 * `<div>` or an `<a href="#">` carrying a click handler is the usual way this
 * component goes wrong, and it costs keyboard users the element entirely.
 * Neither branch takes an `onClick` — nothing in this storefront needs one,
 * and adding it would make this the first client component in the tree.
 */

import type { ReactNode } from "react";

interface Common {
  readonly variant?: "primary" | "secondary";
  readonly children: ReactNode;
}

type ButtonProps = Common &
  (
    | { readonly href: string; readonly type?: never; readonly disabled?: never }
    // `disabled` is only on the button branch, and deliberately: a disabled
    // link is not a thing HTML has. A control that must not be used yet is a
    // `<button>`, which browsers and assistive technology both understand as
    // unavailable; `<a aria-disabled>` is still focusable and still followed.
    | { readonly href?: never; readonly type?: "submit" | "button"; readonly disabled?: boolean }
  );

export function Button({ variant = "primary", children, ...rest }: ButtonProps) {
  const className = `button ${variant === "primary" ? "is-primary" : "is-secondary"}`;

  if (rest.href !== undefined) {
    return (
      <a className={className} href={rest.href}>
        {children}
      </a>
    );
  }

  return (
    <button className={className} type={rest.type ?? "submit"} disabled={rest.disabled ?? false}>
      {children}
    </button>
  );
}
