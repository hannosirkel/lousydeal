/**
 * Which component renders a certificate, decided by the version stored on it.
 *
 * **This file is constraint 7 in code.** Contract §5: "A layout is versioned,
 * and an issued certificate keeps the layout it was issued under. When the
 * design changes, new deals get the new layout and every existing deal still
 * renders exactly as its holder first saw it. The deal stores its layout
 * version; a retired layout stays in the codebase and stays tested.
 * Redesigning is additive. It never restyles a certificate somebody already
 * owns."
 *
 * A registry is what makes that true by construction. Adding layout 2 is an
 * entry here and a new component beside `Certificate`; it is not an edit to
 * `Certificate`, and nothing about it can reach a deal issued under layout 1.
 *
 * **The unknown version throws, and does not fall back.** A fallback to the
 * newest layout is the exact failure §5 forbids — it would restyle a
 * certificate somebody already owns, silently, and only for the deals whose
 * layout went missing. The state is reachable: roll an older image over a
 * newer one and every deal issued in between carries a version that image has
 * never heard of. An error on those pages is a deployment saying so out loud;
 * a quietly different-looking certificate is not.
 */

import type { ComponentType } from "react";

import { Certificate, type CertificateProps } from "../components/document/Certificate";
import { CERTIFICATE_LAYOUT_V1 } from "./certificate-model";

/**
 * Every layout this build can render, by version.
 *
 * One entry today. A retired layout is never deleted from here — §5 requires
 * it to stay in the codebase and stay tested — so this map only grows.
 */
export const CERTIFICATE_LAYOUTS: Readonly<Record<number, ComponentType<CertificateProps>>> = {
  [CERTIFICATE_LAYOUT_V1]: Certificate,
};

/**
 * The component for a stored version.
 *
 * Throws rather than returning `undefined`, so a caller cannot accidentally
 * render nothing: a certificate page with no certificate on it is worse than
 * an error, because it looks like the deal was worthless rather than like the
 * server was wrong.
 */
export function certificateLayout(version: number): ComponentType<CertificateProps> {
  const layout = CERTIFICATE_LAYOUTS[version];
  if (layout === undefined) {
    throw new Error(
      `certificate layout ${String(version)} is not in this build; refusing to render it as another layout`,
    );
  }
  return layout;
}
