/**
 * The imprint.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern: the trader identity
 * is per-environment configuration and must be read inside a dynamically
 * rendered request rather than baked into the image.
 */

import { connection } from "next/server";

import { LegalDocument } from "../../../components/document/LegalDocument";
import { getRuntimeConfig } from "../../../config/runtime-config";
import { IMPRINT } from "../../../content/legal/imprint";

export default async function ImprintPage() {
  await connection();
  const { merchant } = getRuntimeConfig();

  return (
    <main>
      <LegalDocument document={IMPRINT} merchant={merchant} />
    </main>
  );
}
