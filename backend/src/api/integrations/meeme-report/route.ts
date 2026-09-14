import { timingSafeEqual } from "node:crypto";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { classifyCommerceCollections, completedCommerceDays, summarizeCommerce, type CommerceCandidate, type CommerceSummary } from "../../../commerce/meeme-report";
import { readBackendRuntimeConfig } from "../../../config/runtime";

export interface ReportConfiguration {
  readonly key: string;
  readonly timeZone: string;
}

type Response = {
  setHeader(name: string, value: string): void;
  status(code: number): Response;
  json(body: CommerceSummary | { readonly status: "unauthorized" | "bad_request" | "unavailable" }): void;
};

function configuredHeader(headers: Record<string, unknown>): string | null {
  const value = headers["x-meeme-report-key"];
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function authenticated(headers: Record<string, unknown>, expected: string): boolean {
  const candidate = configuredHeader(headers);
  if (candidate === null) return false;
  const supplied = Buffer.from(candidate, "utf8");
  const actual = Buffer.from(expected, "utf8");
  return supplied.length === actual.length && timingSafeEqual(supplied, actual);
}

function hasQuerySyntax(originalUrl: unknown): boolean {
  return typeof originalUrl !== "string" || originalUrl.includes("?");
}

/** Reject unauthenticated/query-bearing requests before their report callback is reachable. */
export function createMeemeReportHandler(
  configuration: ReportConfiguration | null,
  report: () => Promise<CommerceSummary>,
): (request: Pick<MedusaRequest, "originalUrl" | "headers">, response: Response) => Promise<void> {
  return async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (hasQuerySyntax(request.originalUrl)) {
      response.status(400).json({ status: "bad_request" });
      return;
    }
    if (configuration === null) {
      response.status(503).json({ status: "unavailable" });
      return;
    }
    if (!authenticated(request.headers as Record<string, unknown>, configuration.key)) {
      response.status(401).json({ status: "unauthorized" });
      return;
    }
    try {
      response.status(200).json(await report());
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  };
}

interface QueryService {
  graph(query: {
    readonly entity: string;
    readonly fields: readonly string[];
    readonly filters: Record<string, unknown>;
    readonly pagination: { readonly skip: number; readonly take: number; readonly order: { readonly id: "ASC" } };
  }): Promise<{ readonly data: readonly unknown[] }>;
}

const COLLECTION_REPORT_FIELDS = [
  "id", "currency_code", "amount", "raw_amount", "captured_amount", "raw_captured_amount", "refunded_amount", "raw_refunded_amount",
  "payments.id", "payments.currency_code", "payments.amount", "payments.raw_amount", "payments.captured_at", "payments.canceled_at",
  "payments.captures.id", "payments.captures.amount", "payments.captures.raw_amount", "payments.captures.created_at",
  "payments.refunds.id", "payments.refunds.amount", "payments.refunds.raw_amount", "payments.refunds.created_at",
  "order.id", "order.version", "order.status", "order.is_draft_order", "order.currency_code", "order.payment_collections.id",
  "order.items.variant_id", "order.items.product_handle", "order.items.title", "order.items.detail.quantity", "order.items.detail.raw_quantity", "order.items.quantity", "order.items.raw_quantity",
  "order.transactions.reference", "order.transactions.reference_id", "order.transactions.amount", "order.transactions.raw_amount", "order.transactions.currency_code",
] as const;

const DISCOVERIES = [
  { entity: "capture", fields: ["id", "created_at", "payment_id", "payment.id", "payment.payment_collection_id"] },
  { entity: "refund", fields: ["id", "created_at", "payment_id", "payment.id", "payment.payment_collection_id"] },
  { entity: "payment", fields: ["id", "captured_at", "payment_collection_id"] },
] as const;

type DiscoveryKind = typeof DISCOVERIES[number]["entity"];

interface CandidateObservation {
  readonly kind: DiscoveryKind;
  readonly id: string;
  readonly normalizedAt: string | null;
  readonly relevant: boolean;
  readonly paymentId: string | null;
  readonly collectionId: string | null;
  readonly fingerprint: string;
}

interface CandidateRegistryEntry {
  readonly kind: DiscoveryKind;
  readonly id: string;
  relevant: boolean;
  invalid: boolean;
  readonly fingerprints: Set<string>;
  readonly observations: CandidateObservation[];
}

function localDateLabel(value: unknown, timeZone: string): string | null {
  const normalized = normalizedTimestamp(value);
  const instant = normalized === null ? null : new Date(normalized);
  if (instant === null || Number.isNaN(instant.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
    const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return fields.year !== undefined && fields.month !== undefined && fields.day !== undefined ? `${fields.year}-${fields.month}-${fields.day}` : null;
  } catch { return null; }
}

function normalizedTimestamp(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Timestamp-only discovery is paged before later ID-scoped hydration. */
export async function reportFromQuery(query: QueryService, timeZone: string, now = new Date()): Promise<CommerceSummary> {
  const days = completedCommerceDays(timeZone, now);
  const first = new Date(`${days[0]}T00:00:00.000Z`);
  first.setUTCDate(first.getUTCDate() - 1);
  const last = new Date(`${days.at(-1)}T00:00:00.000Z`);
  last.setUTCDate(last.getUTCDate() + 2);
  const collectionIds = new Set<string>();
  const candidates: CommerceCandidate[] = [];
  const registry = new Map<string, CandidateRegistryEntry>();
  let omittedRecords = 0;
  for (const discovery of DISCOVERIES) {
    const timestamp = discovery.entity === "payment" ? "captured_at" : "created_at";
    for (let skip = 0; ; skip += 100) {
      const { data } = await query.graph({ entity: discovery.entity, fields: discovery.fields, filters: { [timestamp]: { $gte: first.toISOString(), $lt: last.toISOString() } }, pagination: { skip, take: 100, order: { id: "ASC" } } });
      for (const candidate of data) {
        const row = candidate as { readonly id?: unknown; readonly created_at?: unknown; readonly captured_at?: unknown; readonly payment_id?: unknown; readonly payment_collection_id?: unknown; readonly payment?: { readonly id?: unknown; readonly payment_collection_id?: unknown } };
        const discoveredAt = discovery.entity === "payment" ? row.captured_at : row.created_at;
        const normalized = normalizedTimestamp(discoveredAt);
        const label = normalized === null ? null : localDateLabel(normalized, timeZone);
        const relevant = normalized === null || label === null || days.includes(label);
        const candidateId = typeof row.id === "string" && row.id.length > 0 ? row.id : null;
        const collectionId = typeof row.payment_collection_id === "string"
          ? row.payment_collection_id
          : typeof row.payment?.payment_collection_id === "string" ? row.payment.payment_collection_id : null;
        const paymentId = discovery.entity === "payment" ? null : typeof row.payment_id === "string"
          ? row.payment_id
          : typeof row.payment?.id === "string" ? row.payment.id : null;
        if (candidateId === null) {
          if (relevant) omittedRecords += 1;
          continue;
        }
        const observation: CandidateObservation = {
          kind: discovery.entity,
          id: candidateId,
          normalizedAt: normalized,
          relevant,
          paymentId,
          collectionId,
          fingerprint: JSON.stringify([discovery.entity, candidateId, normalized, paymentId, collectionId]),
        };
        const key = `${discovery.entity}:${candidateId}`;
        const entry = registry.get(key) ?? {
          kind: discovery.entity,
          id: candidateId,
          relevant: false,
          invalid: false,
          fingerprints: new Set<string>(),
          observations: [],
        };
        entry.relevant ||= relevant;
        entry.invalid ||= normalized === null || label === null;
        entry.fingerprints.add(observation.fingerprint);
        entry.observations.push(observation);
        registry.set(key, entry);
      }
      if (data.length < 100) break;
    }
  }

  for (const entry of registry.values()) {
    if (!entry.relevant) continue;
    const repeatedMovement = entry.kind !== "payment" && entry.observations.length > 1;
    const valid = !entry.invalid && entry.fingerprints.size === 1 && !repeatedMovement;
    const observation = entry.observations[0]!;
    if (valid) {
      if (observation.collectionId !== null) collectionIds.add(observation.collectionId);
      if (entry.kind === "payment") {
        candidates.push({ kind: "payment", id: entry.id, collectionId: observation.collectionId, capturedAt: observation.normalizedAt! });
      } else {
        candidates.push({ kind: entry.kind, id: entry.id, paymentId: observation.paymentId, collectionId: observation.collectionId, occurredAt: observation.normalizedAt! });
      }
      continue;
    }
    if (entry.kind === "payment") {
      candidates.push({ kind: "payment", id: entry.id, collectionId: null, capturedAt: "" });
      continue;
    }
    const observedPaymentIds = new Set(entry.observations.map((item) => item.paymentId));
    const paymentId = observedPaymentIds.size === 1 ? entry.observations[0]!.paymentId : null;
    candidates.push({ kind: entry.kind, id: entry.id, paymentId, collectionId: null, occurredAt: "" });
  }
  const hydrated: unknown[] = [];
  for (const batch of Array.from(collectionIds).sort().reduce<string[][]>((all, id, index) => {
    if (index % 100 === 0) all.push([]); all.at(-1)!.push(id); return all;
  }, [])) {
    const { data } = await query.graph({ entity: "payment_collection", fields: COLLECTION_REPORT_FIELDS, filters: { id: batch }, pagination: { skip: 0, take: batch.length, order: { id: "ASC" } } });
    hydrated.push(...data);
  }
  const classified = classifyCommerceCollections(hydrated, candidates, days, timeZone);
  return summarizeCommerce(days, timeZone, classified.movements, omittedRecords + classified.omittedRecords);
}

export async function GET(request: MedusaRequest, response: MedusaResponse): Promise<void> {
  const configuration = readBackendRuntimeConfig(process.env).meemeReport;
  const handler = createMeemeReportHandler(configuration, async () => {
    const query = request.scope.resolve(ContainerRegistrationKeys.QUERY) as unknown as QueryService;
    return reportFromQuery(query, configuration!.timeZone);
  });
  await handler(request, response as unknown as Response);
}
