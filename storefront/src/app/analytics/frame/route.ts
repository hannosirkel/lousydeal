import { analyticsFrameDocument } from "../../../lib/analytics-frame";

/** Inert until its consent-owning parent supplies a validated configuration. */
export function GET(): Response {
  return new Response(analyticsFrameDocument(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net; connect-src https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com; img-src https://*.google-analytics.com https://www.facebook.com; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; sandbox allow-scripts",
    },
  });
}
