/**
 * Refunds and Withdrawal.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern: the trader identity
 * is per-environment configuration and is read inside a dynamically rendered
 * request rather than baked into the image.
 */

import { connection } from "next/server";

import { LegalDocument } from "../../../components/document/LegalDocument";
import { getRuntimeConfig } from "../../../config/runtime-config";
import { REFUNDS } from "../../../content/legal/refunds";

export default async function RefundsPage() {
  await connection();
  const { merchant } = getRuntimeConfig();

  return (
    <main>
      <LegalDocument document={REFUNDS} merchant={merchant} />
    </main>
  );
}
