import { NextResponse, type NextRequest } from "next/server";

import { getRuntimeConfig } from "./config/runtime-config";

function hostnameFromHostHeader(host: string | null): string | null {
  if (host === null) return null;
  const normalized = host.trim().toLowerCase().replace(/:\d+$/, "");
  return normalized === "" ? null : normalized;
}

/** Collapse only the configured www alias onto the server-owned canonical origin. */
export function proxy(request: NextRequest): NextResponse {
  const { baseUrl, canonicalHost } = getRuntimeConfig().site;
  if (baseUrl === null || canonicalHost === null) return NextResponse.next();

  const requestHost = hostnameFromHostHeader(request.headers.get("host"));
  if (requestHost !== `www.${canonicalHost}`) return NextResponse.next();

  const target = new URL(baseUrl);
  target.pathname = request.nextUrl.pathname;
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
