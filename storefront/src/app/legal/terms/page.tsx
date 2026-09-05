/**
 * The Terms of Service.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern: the trader identity
 * is per-environment configuration and is read inside a dynamically rendered
 * request rather than baked into the image.
 */

import { connection } from "next/server";

import { LegalDocument } from "../../../components/document/LegalDocument";
import { getRuntimeConfig } from "../../../config/runtime-config";
import { TERMS } from "../../../content/legal/terms";

export default async function TermsPage() {
  await connection();
  const { merchant } = getRuntimeConfig();

  return (
    <main>
      <LegalDocument document={TERMS} merchant={merchant} />
    </main>
  );
}
