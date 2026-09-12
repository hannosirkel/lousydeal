# LD-10 — Provider reporting

Add a strictly read-only, aggregate Google Analytics and Meta reporting path
after launch. This is deferred work: it neither blocks LD-08 nor changes the
consent-gated Google Analytics and Meta Pixel collection already delivered for
the storefront.

The contract is [`fresh-build.md`](./fresh-build.md), especially its security,
analytics and secret-handling constraints. This slice may begin only after the
operator has launched and M1/O1's repaired, merged social-draft interface is
available. It preserves that workflow: Buffer creates drafts only for the six
supported networks, and Reddit remains manual post/reply drafts.

## Outcome and boundaries

Meeme may request three fixed summaries through its existing authenticated,
TLS-pinned webhook. It never receives a provider, Buffer or n8n administration
credential, and no route can publish, schedule, reply, moderate or send a
message.

| Action | Fixed result |
| --- | --- |
| `analytics-summary` | The preceding seven completed days in the bound GA4 property timezone: aggregate `activeUsers`, `sessions`, `eventCount`, and `eventCount` by the eleven fixed funnel events, at most eleven rows. |
| `social-insights` | One bound Facebook or Instagram owned asset, the preceding seven completed days and at most two pre-authorized aggregate metrics. |
| `comment-summary` | At most ten bound owned posts/media: the shop's own permalink, publication timestamp and aggregate comment count. |

The webhook accepts no account/property/asset IDs, paths, fields, metrics, date
ranges, cursors, credentials, methods or free-form query values. The
implementation pins hosts, methods, paths, timeouts and response sizes; refuses
redirects and pagination loops; retains no n8n execution data; and returns
sanitized state only (`unavailable`, `incomplete` or `zero`), never raw provider
errors.

It must never read, request or return commenter identity, text or IDs; replies;
direct messages; arbitrary posts; individual comments; or any personal data.
No provider write, moderation or messaging permission belongs in this slice.

## Tasks

Each task is one reviewable pull request or one explicitly operator-owned
preflight. Existing draft PRs — Meeme #9, private `orange-inventory` #49 and
public `orange` #98 — are evidence only. Reuse is allowed solely after
re-review and rebasing each change on the repaired, merged M1/O1 interface;
none may be merged or treated as current without that work.

### P1 — Operator authorization and preflight

**Repositories changed:** none. **State owners:** Google Analytics and Meta.

- [ ] Create a dedicated Google service account, enable the GA Data API and
      grant it Viewer only on the intended GA4 property. Use only the
      `analytics.readonly` scope, no delegation or impersonation. Place its
      standard JSON key only in an approved ignored Orange source; record the
      numeric property ID privately.
- [ ] Obtain a separate Meta read token from an operator controlling the bound
      owned Facebook Page and linked professional Instagram asset. Verify the
      asset binding, approved Graph version, least scopes/tasks/granular
      targets, validity/expiry and one-or-two useful aggregate metrics per
      channel. An app ID or secret alone is not read authority.
- [ ] Use current official provider documentation and sanitized, fixed probes
      to verify the GA seven-day report and bounded Meta owned-post/media
      response shapes. Do not print credentials, identifiers or report data,
      and request no write, moderation, individual-comment or messaging scope.
- [ ] If either authorization is incomplete, record the external prerequisite,
      leave every provider flag disabled and keep the Buffer-draft workflow
      unchanged. This is a deferred-slice pause, never a launch blocker.

### M3 — Fixed aggregate report workflow

**Repository:** `meeme`, stacked on repaired M1.

**Files:** the social-drafts helper/skill, workflow generator/logic/export and
tests, `TOOLS.md`, and the operating-model documentation as required.

- [ ] Re-review and rebase draft PR #9 on repaired M1 before retaining any
      useful implementation. Add the three fixed actions and only the action
      inputs/results described above; no live property or asset identifier is
      committed into the generic artifact.
- [ ] Preserve M1's existing Buffer discovery/create-draft/status actions and
      make them fully usable when reports are disabled or unavailable. Dispatch
      reporting reads before Buffer discovery without adding a publishing
      capability.
- [ ] Add behavioral fixtures, generated-artifact parity checks and negative
      tests rejecting arbitrary identifiers, paths, fields, metrics, date
      ranges, cursors, credentials, free-form data, provider errors and every
      write request.
- [ ] Run Meeme's full validation and `habit-hooks`, then obtain review.

### I3 — Private bindings and disabled defaults

**Repository:** private `orange-inventory`, stacked on repaired O1 inventory.

**Files:** the Lousy Deal source registry/provider settings, focused validation
and the private operating record.

- [ ] Re-review and rebase draft PR #49 on repaired O1 before retaining any
      useful implementation. Declare only approved ignored source filenames,
      the numeric GA property ID and the bound Facebook Page/linked Instagram
      identifiers; never fabricate placeholders or reuse an unrelated
      principal.
- [ ] Store the preflight's Graph version and metric allow-list in the private
      binding. Both provider-enable flags default to disabled and remain so
      until P1 authorization and exact bindings are verified.
- [ ] Validate the inventory in both the existing Orange context and O3's
      context. Inventory lands before O3 and is reviewed without exposing a
      credential or private identifier in a public repository.

### O3 — Credential custody and bound workflow import

**Repository:** public-ready `orange`, stacked on M3 and I3.

**Files:** OpenBao source/seed helpers, n8n credential import and workflow
lifecycle, reserved examples, focused tests and provisioning documentation.

- [ ] Re-review and rebase draft PR #98 on repaired O1 before retaining any
      useful implementation. Add separately selected GA-read and Meta-read
      sources that never become prerequisites for Buffer import.
- [ ] Import secrets only through the approved ignored-file, stdin, OpenBao and
      n8n lifecycle. Keep values out of arguments, output, facts, diffs,
      temporary files and Meeme. Prefer n8n's native Google service-account
      credential; import the separate Meta asset token as a bound read-only
      credential.
- [ ] Verify M3's generic artifact hash before secret access or network work.
      Bind only the designated private configuration object, validate numeric
      IDs and explicit enable flags, and prove every other byte is derived from
      the reviewed template. Read back only safe metadata; a second run is
      unchanged.
- [ ] Retain O1's check-mode, TLS, least-privilege and tamper protections.
      Prove Meeme receives only its existing webhook key/config, not provider,
      Buffer or n8n administration credentials. Run Orange's full gate and
      obtain review.

### V3 — Integration, rotation and disabled-state recovery

**Repositories changed:** none. **State owners:** OpenBao, n8n, Google
Analytics, Meta and Meeme.

- [ ] With both providers explicitly enabled, verify the bound GA property and
      Meta owned assets through every fixed read action, plus wrong-key,
      arbitrary-ID and provider-unavailable probes. Confirm sanitized aggregate
      schemas, an empty-data access result where applicable, no public content
      change and continuing Buffer-draft readiness.
- [ ] Verify credential rotation by replacing each source through the reviewed
      lifecycle, reading back safe credential metadata and repeating the fixed
      probes. Verify revocation separately: revoke the GA principal/key or the
      Meta token, confirm reporting becomes unavailable without raw errors, and
      record the operator recovery steps privately.
- [ ] Exercise the disabled-state rollback: turn both explicit enable flags
      off, disable the reporting workflow if needed, and confirm every report
      action is unavailable while M1's Buffer drafts and manual Reddit drafts
      remain usable. Do not rotate the Buffer credential for this rollback.

## Dependency order and completion

`repaired M1/O1 → P1 → M3 and I3 → O3 → V3`. M3 and I3 may prepare only
fixtures and disabled contracts before P1, but their final interface and
bindings follow P1's verified facts. I3 lands before O3. This slice completes
only after V3's enabled, rotation/revocation and disabled-state evidence is
recorded. It remains non-launch-blocking throughout.

## Rollback

Set both provider-enable flags to disabled and disable the reporting workflow.
If a credential may be exposed or must be retired, revoke the Google service
account key or Meta token and remove it through the OpenBao/n8n lifecycle.
Restore the reviewed M1 Buffer-draft workflow if necessary; it retains six
network drafts and manual Reddit drafts without provider reporting.
