/* global process, Buffer, fetch, URL, URLSearchParams, console, window, document, location, history, parent, localStorage, dispatchEvent, PopStateEvent, postMessage */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

// Workstation browser tooling is intentionally separate from storefront dependencies.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve(import.meta.dirname, "../../..");
const compile = (entry, options = {}) => build({ entryPoints: [resolve(root, entry)], bundle: true, write: false, jsx: "automatic", ...options });
const fixture = (await compile("storefront/tests/browser/analytics.fixture.tsx", {
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "next/navigation": resolve(import.meta.dirname, "navigation.fixture.ts") },
})).outputFiles[0].text;
const routeModule = (await compile("storefront/src/app/analytics/frame/route.ts", { format: "esm" })).outputFiles[0].text;
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(routeModule).toString("base64")}`);
const frameResponse = GET(), frameDocument = await frameResponse.text();
const sdk = async (file, url) => file ? readFile(file, "utf8") : (await fetch(url)).text();
const [googleSDK, metaSDK] = await Promise.all([
  sdk(process.env.ANALYTICS_GOOGLE_SDK_FILE, "https://www.googletagmanager.com/gtag/js?id=G-EXAMPLE"),
  sdk(process.env.ANALYTICS_META_SDK_FILE, "https://connect.facebook.net/en_US/fbevents.js"),
]);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true, args: ["--no-sandbox", "--host-resolver-rules=MAP * ~NOTFOUND"] });
const config = { googleTagId: "G-EXAMPLE", metaPixelId: "123456789" };
const consentKey = "lousydeal.analytics-consent.v1";
const names = ["landing_view", "tier_selected", "baldrick_opened", "baldrick_intent", "bad_discount_issued", "bad_discount_accepted", "gift_selected", "merch_added", "checkout_started", "purchase_completed", "certificate_shared"];

async function scenario({ choice, ids = config, path = "/", delay = false, fail = false } = {}) {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(), requests = [], pending = [];
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "shop.example") {
      if (url.pathname === "/analytics/frame") return route.fulfill({ headers: Object.fromEntries(frameResponse.headers), body: frameDocument });
      if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: fixture });
      return route.fulfill({ contentType: "text/html", body: '<!doctype html><title>SECRET TITLE</title><div id="app"></div><script src="/fixture.js"></script>' });
    }
    requests.push({ url: request.url(), body: request.postData(), headers: await request.allHeaders() });
    if (url.hostname === "www.googletagmanager.com" || url.pathname === "/en_US/fbevents.js") {
      const deliver = () => fail ? route.abort() : route.fulfill({ contentType: "text/javascript", body: url.hostname === "www.googletagmanager.com" ? googleSDK : metaSDK });
      if (delay) { pending.push(deliver); return; }
      return deliver();
    }
    // Only account configuration is stubbed; the public SDK itself is unmodified.
    if (url.pathname.startsWith("/signals/config/")) return route.fulfill({ contentType: "text/javascript", body: "fbq.registerPlugin('123456789',{__fbEventsPlugin:1,plugin:function(fbq,instance){instance.configLoaded('123456789')}})" });
    return route.fulfill({ status: 200, body: "" });
  });
  await page.goto(`https://shop.example${path}`);
  if (choice) await page.evaluate(([key, value]) => localStorage.setItem(key, value), [consentKey, `v1:${choice}`]);
  await page.evaluate((ids) => window.analyticsFixture.render(ids), ids);
  await page.getByRole("heading", { name: "Analytics consent fixture" }).waitFor();
  return { page, context, requests, pending };
}

function eventRecords(requests, vendor) {
  return requests.flatMap((request) => {
    const url = new URL(request.url);
    if (vendor === "google" ? !url.pathname.endsWith("/collect") : url.pathname !== "/tr/") return [];
    return (request.body || "").split(/\r?\n/).map((body) => new URLSearchParams(`${url.search.slice(1)}&${body}`));
  });
}

function assertPrivate(requests) {
  for (const request of requests) {
    const decoded = decodeURIComponent(JSON.stringify(request));
    assert.doesNotMatch(decoded, /SECRET|done-deals|withdraw|email=|inscription|giftMessage|cart_id|order_id/);
    assert.equal(request.headers.referer, undefined);
    assert.equal(request.headers.cookie, undefined);
  }
}

try {
  for (const choice of [undefined, "declined"]) {
    const s = await scenario({ choice });
    if (!choice) await s.page.getByRole("button", { name: "Refuse", exact: true }).click();
    await s.page.evaluate(() => window.analyticsFixture.emit("checkout_started"));
    await s.page.waitForTimeout(150);
    assert.equal(await s.page.locator("iframe").count(), 0);
    assert.equal(s.requests.length, 0);
    await s.context.close();
  }
  console.log("PASS unanswered/refused: no frame, vendor resources or requests");

  for (const ids of [{ googleTagId: null, metaPixelId: null }, { googleTagId: "G-EXAMPLE", metaPixelId: null }, { googleTagId: null, metaPixelId: "123456789" }, config]) {
    const s = await scenario({ ids });
    await s.page.getByRole("button", { name: "Agree", exact: true }).click();
    await s.page.waitForTimeout(500);
    assert.equal(s.requests.some((r) => r.url.includes("googletagmanager")), ids.googleTagId !== null);
    assert.equal(s.requests.some((r) => r.url.includes("fbevents.js")), ids.metaPixelId !== null);
    assertPrivate(s.requests);
    await s.context.close();
  }
  console.log("PASS all configured-ID combinations");

  const delivery = await scenario({ choice: "granted", path: "/done-deals/SECRET?email=SECRET" });
  await delivery.page.waitForTimeout(500);
  await delivery.page.evaluate((names) => { for (const name of names) window.analyticsFixture.emit(name, { routeClass: "certificate", productHandle: "lousy-deal", currency: "usd", amount: 500, href: location.href, title: document.title, email: "SECRET" }); }, names);
  await delivery.page.waitForTimeout(8500);
  for (const vendor of ["google", "meta"]) {
    const records = eventRecords(delivery.requests, vendor);
    for (const name of names) assert(records.some((record) => record.get(vendor === "google" ? "en" : "ev") === name), `${vendor} missing ${name}`);
    assert(records.every((r) => names.includes(r.get(vendor === "google" ? "en" : "ev"))), `${vendor} automatic event`);
    const purchase = records.find((r) => r.get(vendor === "google" ? "en" : "ev") === "purchase_completed");
    assert.equal(purchase.get(vendor === "google" ? "ep.route_class" : "cd[route_class]"), "certificate");
    assert.equal(purchase.get(vendor === "google" ? "epn.amount" : "cd[amount]"), "500");
  }
  assertPrivate(delivery.requests);
  assert.deepEqual(await delivery.context.cookies(), []);
  const frame = delivery.page.frames()[1];
  assert.deepEqual(await frame.evaluate(() => {
    let parentDenied = false, storageDenied = false;
    try { void parent.document; } catch { parentDenied = true; }
    try { void localStorage; } catch { storageDenied = true; }
    document.cookie = "probe=1";
    return { parentDenied, storageDenied, cookie: document.cookie, referrer: document.referrer };
  }), { parentDenied: true, storageDenied: true, cookie: "", referrer: "" });
  for (const path of ["/", "/legal/withdraw?email=SECRET", "/done-deals/SECRET", "/"]) {
    await delivery.page.evaluate((path) => { history.pushState(null, "", path); dispatchEvent(new PopStateEvent("popstate")); }, path);
  }
  assert.equal(delivery.page.frames()[1], frame);
  await delivery.page.getByRole("button", { name: "Stop analytics" }).click();
  const count = delivery.requests.length;
  await delivery.page.waitForTimeout(1000);
  assert.equal(delivery.requests.length, count);
  assert.equal(await delivery.page.locator("iframe").count(), 0);
  assertPrivate(delivery.requests);
  await delivery.context.close();
  console.log("PASS all 11 real SDK deliveries, payloads, opaque storage, sensitive client navigation and loaded revocation");

  for (const path of ["/done-deals/SECRET?email=SECRET", "/legal/withdraw?email=SECRET"]) {
    const s = await scenario({ choice: "granted", path, delay: true });
    await s.page.waitForTimeout(250);
    assert.equal(s.pending.length, 2);
    await s.page.getByRole("button", { name: "Stop analytics" }).click();
    await Promise.all(s.pending.map((deliver) => deliver().catch(() => undefined)));
    await s.page.waitForTimeout(500);
    assert.equal(eventRecords(s.requests, "google").length + eventRecords(s.requests, "meta").length, 0);
    assertPrivate(s.requests);
    await s.context.close();
  }
  console.log("PASS sensitive direct navigation and revocation during SDK load");

  const direct = await scenario();
  await direct.page.goto("https://shop.example/analytics/frame");
  await direct.page.evaluate((ids) => postMessage({ kind: "lousydeal.analytics.configure", ...ids }, "*"), config);
  await direct.page.waitForTimeout(150);
  assert.equal(direct.requests.length, 0);
  await direct.context.close();
  console.log("PASS direct frame document stays inert even with self-posted configuration");

  const interactions = await scenario({ delay: true });
  await interactions.page.getByRole("button", { name: "Agree", exact: true }).click();
  await interactions.page.waitForTimeout(200);
  await interactions.page.getByRole("button", { name: "Is there a discount", exact: true }).click();
  await interactions.page.getByRole("button", { name: "Choose tier", exact: true }).click();
  await interactions.page.getByLabel("Ask Baldrick something").fill("discount SECRET");
  await interactions.page.getByLabel("Ask Baldrick something").press("Enter");
  await interactions.page.getByRole("button", { name: "Add merchandise" }).click();
  await interactions.page.waitForURL("https://shop.example/cart");
  await interactions.page.getByRole("button", { name: "Accept code" }).click();
  await interactions.page.waitForFunction(() => window.analyticsFixture.completedActions === 2);
  // Exercise the real share anchor while preventing only its external navigation.
  await interactions.page.locator('[data-analytics-event="certificate_shared"]').first().evaluate((anchor) => {
    anchor.addEventListener("click", (event) => event.preventDefault(), { once: true });
    anchor.click();
  });
  await Promise.all(interactions.pending.map((deliver) => deliver()));
  await interactions.page.waitForTimeout(8500);
  for (const vendor of ["google", "meta"]) {
    const records = eventRecords(interactions.requests, vendor).map((r) => r.get(vendor === "google" ? "en" : "ev"));
    assert.equal(records.filter((name) => name === "baldrick_opened").length, 1);
    assert.equal(records.filter((name) => name === "bad_discount_issued").length, 2);
    assert.equal(records.filter((name) => name === "merch_added").length, 1);
    assert.equal(records.filter((name) => name === "bad_discount_accepted").length, 1);
    assert.equal(records.filter((name) => name === "tier_selected").length, 1);
    assert.equal(records.filter((name) => name === "certificate_shared").length, 1);
  }
  assertPrivate(interactions.requests);
  assert.equal(await interactions.page.evaluate(() => window.analyticsFixture.completedActions), 2);
  await interactions.page.getByRole("button", { name: "Privacy choices" }).click();
  assert.equal(await interactions.page.getByRole("dialog").evaluate((node) => node === document.activeElement), true);
  await interactions.page.getByRole("button", { name: "Refuse", exact: true }).click();
  assert.equal(await interactions.page.getByRole("button", { name: "Privacy choices" }).evaluate((node) => node === document.activeElement), true);
  assert.equal(await interactions.page.locator("iframe").count(), 0);
  await interactions.context.close();
  console.log("PASS delayed SDK delivery, typed/quick discount issuance, consent-safe visible Baldrick, success-only merch, real share click and preference focus");

  const refused = await scenario({ choice: "granted" });
  await refused.page.getByLabel("Outcome", { exact: true }).fill("fail");
  await refused.page.getByRole("button", { name: "Add merchandise" }).click();
  await refused.page.getByText("Action refused", { exact: true }).waitFor();
  await refused.page.getByLabel("Code outcome").fill("fail");
  await refused.page.getByRole("button", { name: "Accept code" }).click();
  await refused.page.waitForFunction(() => document.querySelectorAll('form').length === 2);
  await refused.page.waitForTimeout(8500);
  for (const vendor of ["google", "meta"]) assert(!eventRecords(refused.requests, vendor).some((r) => ["merch_added", "bad_discount_accepted"].includes(r.get(vendor === "google" ? "en" : "ev"))));
  assert.equal(await refused.page.evaluate(() => window.analyticsFixture.completedActions), 0);
  await refused.context.close();
  console.log("PASS failed action emits no success event");

  const s = await scenario({ fail: true });
  await s.page.getByRole("button", { name: "Agree", exact: true }).click();
  await s.page.getByRole("button", { name: "Add merchandise" }).click();
  await s.page.waitForURL("https://shop.example/cart");
  await s.context.close();
  console.log("PASS SDK network failure leaves commerce navigation working");
} finally {
  await browser.close();
}
