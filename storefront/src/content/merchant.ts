/**
 * The trader identity vocabulary, and the substitution that puts it into
 * content.
 *
 * Decision `004` is the authority: content carries literal placeholders, a
 * resolver substitutes them at render from values read server-side per
 * request, and an unconfigured field is never a placeholder string and never a
 * fabricated value. What it becomes depends on what the surface owes the
 * reader — `004` draws that line, and the reason it gives is worth reading
 * there rather than restated here.
 *
 * {@link resolveText} returns *parts* rather than a string so that a caller
 * handed a gap cannot interpolate an empty string and produce prose that reads
 * as finished. The distinction is a type, not a convention.
 *
 * **This module holds the vocabulary and the mechanism. It holds no copy** —
 * `004` is specific that a disclosure must be a placeholder in a content file
 * rather than interpolated inside a component, so the templates live in
 * `./chrome.ts` and its siblings.
 */

import type { RuntimeConfig } from "../config/runtime-config";

/**
 * Tied to the configuration rather than restated, so a field added to one and
 * not the other is a `tsc` error instead of a silent divergence between two
 * hand-maintained lists.
 */
export type MerchantIdentity = RuntimeConfig["merchant"];

/**
 * The placeholder vocabulary: the token a content file may write, the
 * configuration field behind it, and the label a gap wears when that field is
 * missing. One record, so there is one enumeration of the five fields rather
 * than three that must agree.
 */
export const MERCHANT_PLACEHOLDERS = {
  merchantLegalName: { field: "legalName", label: "LEGAL NAME" },
  merchantAddress: { field: "address", label: "REGISTERED ADDRESS" },
  merchantEmail: { field: "email", label: "CONTACT ADDRESS" },
  merchantRegistryCode: { field: "registryCode", label: "REGISTRY CODE" },
  merchantVatNumber: { field: "vatNumber", label: "VAT NUMBER" },
} as const satisfies Record<string, { field: keyof MerchantIdentity; label: string }>;

export type MerchantPlaceholder = keyof typeof MERCHANT_PLACEHOLDERS;

export type ResolvedPart =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "gap"; readonly label: string };

/**
 * Anything brace-delimited, not just anything letter-shaped.
 *
 * The narrower `\{([A-Za-z]+)\}` this started as was porous in a way that
 * defeated the guard below entirely: `{REG_CODE}`, `{COMPANY_LEGAL_NAME}` and
 * `{VAT_NO}` — the exact token shapes `docs/working/lousyvisual.md` §3 asked
 * for, and so the shapes a content author is most likely to type — contain an
 * underscore, never matched, never reached the throw, and were emitted into
 * the page as literal text. Measured before the change: `"Reg {REG_CODE}."`
 * resolved to `[{kind:"text",text:"Reg {REG_CODE}."}]`.
 */
const TOKEN = /\{([^{}]*)\}/g;

/** The gap a missing field leaves, as a caller must render it. */
export function gapFor(placeholder: MerchantPlaceholder): ResolvedPart {
  return { kind: "gap", label: MERCHANT_PLACEHOLDERS[placeholder].label };
}

/**
 * Splits `template` into literal text and the gaps left by unconfigured
 * fields.
 *
 * Throws on any brace-delimited token the vocabulary does not declare. A typo
 * in a content file is a defect in this repository, not a runtime condition to
 * degrade around, and degrading is what leaves a placeholder string on the
 * page — the thing `004` forbids.
 */
export function resolveText(template: string, identity: MerchantIdentity): ResolvedPart[] {
  const parts: ResolvedPart[] = [];
  let cursor = 0;

  for (const match of template.matchAll(TOKEN)) {
    const [token, rawName] = match;
    const name = (rawName ?? "").trim();
    // `Object.hasOwn`, not `in`: `in` walks the prototype chain, so `{toString}`
    // passed the guard, found no field, and produced `{kind:"text"}` with no
    // `text` at all -- a value this module's own type says cannot exist, which
    // rendered as the silent blank the return type is meant to prevent.
    if (!Object.hasOwn(MERCHANT_PLACEHOLDERS, name)) {
      throw new Error(
        `unknown placeholder ${token} -- content files may only use ${Object.keys(MERCHANT_PLACEHOLDERS)
          .map((key) => `{${key}}`)
          .join(", ")}`,
      );
    }
    const placeholder = name as MerchantPlaceholder;
    const literal = template.slice(cursor, match.index);
    if (literal !== "") parts.push({ kind: "text", text: literal });

    const value = identity[MERCHANT_PLACEHOLDERS[placeholder].field];
    parts.push(value === null ? gapFor(placeholder) : { kind: "text", text: value });
    cursor = match.index + token.length;
  }

  const tail = template.slice(cursor);
  if (tail !== "") parts.push({ kind: "text", text: tail });
  return parts;
}

/** Whether any field the template asked for was unconfigured. */
export function hasGap(parts: readonly ResolvedPart[]): boolean {
  return parts.some((part) => part.kind === "gap");
}
