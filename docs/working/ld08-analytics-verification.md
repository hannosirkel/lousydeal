# LD-08 L2 analytics verification

The browser integration uses one opaque, consent-owned measurement frame.
The independent L2 review must still approve these fixes. Vendor account
settings and deployed verification remain E1/F2 responsibilities.

## Browser boundary

`/analytics/frame` returns an inert HTML document with no IDs or query values.
It loads vendors only after a configuration message from its parent. Direct
visits and self-posted messages remain inert. The parent mounts it only after
consent, uses `sandbox="allow-scripts"` and sends only sanitized event fields.
The response also enforces sandboxing, no referrer, no storage caching and no
indexing. The frame cannot access the parent document or its storage.

Google receives a fixed synthetic page identity. Meta sees only the fixed
measurement route. The frame has no forms, links or client history changes.
Revocation destroys the frame synchronously and discards its pending events.
Already-sent requests cannot be recalled.

Google's public SDK reads `document.cookie` even with storage denied. The
opaque-origin exception aborts event delivery. The frame therefore exposes
an empty cookie getter and a no-op setter. This stores nothing and grants no
access to native storage. Chromium request tests exercise the unmodified SDK
through that compatibility boundary. Google generates transient measurement
identifiers; neither vendor receives a customer, cart or order identifier.

## One behaviour change outside the instrumentation, declared

Instrumenting `bad_discount_issued` exposed a copy defect and this slice fixes
it, which is the only visitor-visible change here that is not measurement. The
widget opened its conversation at `step: null`. `offered` reads the step, so it
returned nothing, and `Surface` renders no list for an empty array: the two
quick replies the greeting declares, "What do I get" and "Is there a discount",
were written, closed over by the script's reachability guard, and never once
rendered. The widget now opens at `BALDRICK_GREETING`, which is what
`content/baldrick.ts` already documents that constant to mean, and both buttons
appear and reach their steps.

Nothing else moves. Typed messages re-match against the whole script regardless
of the step, so no typed path changes; no cart, price or checkout behaviour is
touched. `baldrick-widget.test.ts` covers the opening state, both presses and
the discount event that keys on one of them.

`baldrick_opened` means the widget first intersects the viewport while consent
is active. Acceptance can measure a widget that is currently visible. Earlier
interactions are never retained or replayed. Discount issuance follows the
resolved discount response for both input paths. Merch and code acceptance
events follow successful server actions; the original no-script POST and
refusal redirects remain available.

## Reproduce the browser checks

Run `npm ci` and install Playwright in a workstation tools directory. Set
`PLAYWRIGHT_MODULE` to its module path and `CHROMIUM_EXECUTABLE` to Chromium.
Run `node storefront/tests/browser/analytics.mjs` from this checkout. This is
workstation-only evidence, deliberately not an npm test command or CI
dependency.

The harness fetches public SDKs using example IDs into memory. It intercepts
every browser vendor request and sends no measurements externally. Optional
`ANALYTICS_GOOGLE_SDK_FILE` and `ANALYTICS_META_SDK_FILE` paths allow replay of
downloaded public SDKs. Use Google's `G-EXAMPLE` SDK for the committed harness.
Only Meta's empty example account configuration is stubbed; both dispatchers
and request serializers are the unmodified vendor SDKs.

The harness checks unanswered/refused/accepted/revoked consent, all ID
combinations, all eleven event names, payloads, delayed and loaded dispatch,
direct and client sensitive navigation, inert frame visits, empty native
storage, preference focus, actual share/Baldrick/form interactions, and failed
SDK/action non-interference. Unit tests also cover hostile messages, invalid
IDs, repeated initialization, dispatcher exceptions and server refusal paths.

On 2026-09-12, Chromium 153 passed this harness. No intercepted request carried
the sentinel private page title, URL, query or form value. No request carried
a referrer or cookie header, and the fresh browser cookie jar remained empty.
This does not promise how another browser handles pre-existing vendor-domain
cookies or how a vendor retains data already received.

## Required account read-back before publication

Disable the entire Google enhanced-measurement setting, including history,
scroll, form, outbound-link and download events. Keep Google signals,
advertising personalization and user-provided-data collection off. Disable
Meta automatic events and automatic advanced matching. Read back the settings
and record the actual vendor retention periods with the E1 evidence.

A probe with the supplied Google stream on 2026-09-12 observed an automatic
`scroll` event. The browser code does not claim to change that account setting.
E1/F2 must remove it and verify the deployed requests; example-ID tests cannot
stand in for live account configuration. Test deployment IDs must remain absent.
