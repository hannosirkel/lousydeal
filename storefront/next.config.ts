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
};

export default nextConfig;
