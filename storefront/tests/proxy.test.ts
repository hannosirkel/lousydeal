import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { proxy } from "../src/proxy";

const originalSiteBaseUrl = process.env.SITE_BASE_URL;

afterEach(() => {
  if (originalSiteBaseUrl === undefined) delete process.env.SITE_BASE_URL;
  else process.env.SITE_BASE_URL = originalSiteBaseUrl;
});

function responseFor(
  url: string,
  host: string,
  init: { method?: string; forwardedHost?: string } = {},
) {
  const headers: Record<string, string> = { host };
  if (init.forwardedHost !== undefined) headers["x-forwarded-host"] = init.forwardedHost;
  return proxy(new NextRequest(url, { method: init.method, headers }));
}

describe("proxy(): the configured www spelling has one canonical origin", () => {
  it("permanently redirects the configured www root to the configured origin", () => {
    process.env.SITE_BASE_URL = "https://canonical.example.test";
    const response = responseFor("https://www.canonical.example.test/", "www.canonical.example.test");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://canonical.example.test/");
  });

  it("preserves the path and query in one hop", () => {
    process.env.SITE_BASE_URL = "https://canonical.example.test";
    const response = responseFor(
      "https://www.canonical.example.test/goods/receipt?utm_source=letter",
      "www.canonical.example.test",
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://canonical.example.test/goods/receipt?utm_source=letter",
    );
  });

  it("uses 308 for a POST so canonicalisation does not change its method", () => {
    process.env.SITE_BASE_URL = "https://canonical.example.test";
    expect(
      responseFor("https://www.canonical.example.test/api/store/store/carts", "www.canonical.example.test", {
        method: "POST",
      }).status,
    ).toBe(308);
  });

  it("normalizes host case and a request port but keeps the configured target port", () => {
    process.env.SITE_BASE_URL = "https://canonical.example.test:8443";
    const response = responseFor(
      "https://www.canonical.example.test:9443/legal?x=1",
      "WWW.CANONICAL.EXAMPLE.TEST:9443",
    );
    expect(response.headers.get("location")).toBe("https://canonical.example.test:8443/legal?x=1");
  });

  it.each([
    ["the canonical host", "canonical.example.test"],
    ["the test host", "test.canonical.example.test"],
    ["somebody else's www host", "www.other.example.test"],
  ])("does not redirect %s", (_label, host) => {
    process.env.SITE_BASE_URL = "https://canonical.example.test";
    expect(responseFor(`https://${host}/`, host).headers.get("location")).toBeNull();
  });

  it.each([
    undefined,
    "not a URL",
    "ftp://canonical.example.test",
    "https://user:pass@canonical.example.test",
    "https://canonical.example.test/path",
  ])("does not redirect when SITE_BASE_URL is absent or malformed: %s", (configured) => {
    if (configured === undefined) delete process.env.SITE_BASE_URL;
    else process.env.SITE_BASE_URL = configured;
    expect(
      responseFor("https://www.canonical.example.test/", "www.canonical.example.test").headers.get("location"),
    ).toBeNull();
  });

  it("never chooses a target from x-forwarded-host", () => {
    process.env.SITE_BASE_URL = "https://canonical.example.test";
    const canonical = responseFor("https://canonical.example.test/", "canonical.example.test", {
      forwardedHost: "www.canonical.example.test",
    });
    expect(canonical.headers.get("location")).toBeNull();

    const www = responseFor("https://www.canonical.example.test/", "www.canonical.example.test", {
      forwardedHost: "attacker.example.test",
    });
    expect(www.headers.get("location")).toBe("https://canonical.example.test/");
  });

  it("keeps an authority-shaped path on the configured origin", () => {
    process.env.SITE_BASE_URL = "https://canonical.example.test";
    const response = responseFor(
      "https://www.canonical.example.test//attacker.example/path?x=1",
      "www.canonical.example.test",
    );
    expect(response.headers.get("location")).toBe(
      "https://canonical.example.test//attacker.example/path?x=1",
    );
  });

  it("keeps a backslash-shaped path on the configured origin", () => {
    process.env.SITE_BASE_URL = "https://canonical.example.test";
    const response = responseFor(
      "https://www.canonical.example.test/\\\\attacker.example/path?x=1",
      "www.canonical.example.test",
    );
    expect(response.headers.get("location")).toBe(
      "https://canonical.example.test///attacker.example/path?x=1",
    );
  });
});
