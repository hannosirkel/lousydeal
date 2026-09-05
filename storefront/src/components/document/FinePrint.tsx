/**
 * Fine print, per `docs/current/brand.md` §3: the fine step, italic,
 * `--ink-soft`. It measures 5.1:1 against the paper, so it is readable text
 * rather than decoration a sighted reader is expected to skip.
 */

import type { ReactNode } from "react";

export function FinePrint({ children }: { readonly children: ReactNode }) {
  return <p className="fine-print">{children}</p>;
}
