import type { NextConfig } from "next";

/**
 * Deliberately empty of anything environment-specific.
 *
 * No base URL, no hostname, no publishable key belongs in this file or
 * anywhere `next build` can see it — `next build` never runs a dynamic
 * route's body, so a value it could see here would be baked into the built
 * image and wrong for every environment but one. Per-environment values are
 * read server-side, per request, from `process.env` in
 * `src/config/runtime-config.ts` instead. See `src/app/layout.tsx` for where
 * that read happens.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // A standalone image runs `node server.js`, which Next only emits under
  // this setting -- see `storefront/Dockerfile`, which copies
  // `.next/standalone` rather than the full `node_modules` tree.
  output: "standalone",
  // PDFKit is required at runtime rather than bundled. It resolves its
  // standard-14 font metrics from files inside its own package, and a bundler
  // that inlines the module without them leaves a library that works until
  // somebody asks for Helvetica. `src/lib/certificate-pdf.ts` never does ask
  // -- it registers real fonts and only those -- so this is belt as well as
  // braces, and it is the setting the package's own guidance names.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
