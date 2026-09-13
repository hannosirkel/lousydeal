/** The public origin as supplied by the request-facing proxy. */
export function requestOrigin(requestHeaders: Pick<Headers, "get">): URL | null {
  const host = requestHeaders.get("host");
  if (host === null) return null;

  const forwarded = requestHeaders.get("x-forwarded-proto");
  const protocol = forwarded === "http" || forwarded === "https" ? forwarded : "https";
  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return null;
  }
}
