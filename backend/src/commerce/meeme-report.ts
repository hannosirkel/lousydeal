import { PRODUCT_TIERS } from "./product-model";

export interface CommerceSummaryDay {
  readonly date: string;
  readonly currencies: readonly {
    readonly currency: string;
    readonly paidOrders: number;
    readonly grossMinor: number;
    readonly refundedMinor: number;
    readonly netMinor: number;
    readonly certificates: number;
    readonly merchUnits: number;
  }[];
}

export interface CommerceSummary {
  readonly status: "available" | "empty" | "incomplete";
  readonly from: string;
  readonly through: string;
  readonly omittedRecords: number;
  readonly days: readonly CommerceSummaryDay[];
}

/** A validated movement, stripped of Medusa's identifiers before aggregation. */
export interface CommerceMovement {
  /** Used only to reject a duplicate provider movement; it never reaches output. */
  readonly id: string;
  readonly kind: "capture" | "refund";
  readonly occurredAt: string;
  readonly currency: string;
  /** A non-negative minor-unit integer. */
  readonly amount: number;
  readonly certificateUnits?: number;
  readonly merchUnits?: number;
}

export type CommerceCandidate =
  | {
      readonly kind: "capture" | "refund";
      readonly id: string;
      readonly paymentId: string | null;
      readonly collectionId: string | null;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "payment";
      readonly id: string;
      readonly collectionId: string | null;
      readonly capturedAt: string;
    };

const MAX_CURRENCIES_PER_DAY = 8;
const CURRENCY = /^[a-z]{3}$/i;

/** The currencies this shop's known regions can price in, with ISO 4217 minor precision. */
export const REVIEWED_CURRENCY_PRECISION: Readonly<Record<string, number>> = {
  AUD: 2, CAD: 2, CHF: 2, DKK: 2, EUR: 2, GBP: 2, JPY: 0, NOK: 2, SEK: 2, USD: 2,
};

function localDate(timeZone: string, instant: Date): string | null {
  if (Number.isNaN(instant.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const year = values.year;
    const month = values.month;
    const day = values.day;
    return year === undefined || month === undefined || day === undefined ? null : `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/** Seven full calendar dates before now in the configured IANA zone. */
export function completedCommerceDays(timeZone: string, now = new Date()): readonly string[] {
  const today = localDate(timeZone, now);
  if (today === null) throw new RangeError("A valid IANA timezone is required");
  const dates: string[] = [];
  const cursor = new Date(`${today}T00:00:00.000Z`);
  for (let offset = 7; offset >= 1; offset -= 1) {
    const day = new Date(cursor.getTime());
    day.setUTCDate(day.getUTCDate() - offset);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

type Totals = {
  paidOrders: number;
  grossMinor: number;
  refundedMinor: number;
  certificates: number;
  merchUnits: number;
  movements: number;
};

function safeAdd(left: number, right: number): number | null {
  const sum = left + right;
  return Number.isSafeInteger(sum) ? sum : null;
}

function validCount(value: number | undefined): number {
  return value ?? 0;
}

function validMovement(movement: CommerceMovement): boolean {
  return typeof movement.id === "string"
    && movement.id.length > 0
    && CURRENCY.test(movement.currency)
    && REVIEWED_CURRENCY_PRECISION[movement.currency.toUpperCase()] !== undefined
    && Number.isSafeInteger(movement.amount)
    && movement.amount >= 0
    && Number.isSafeInteger(validCount(movement.certificateUnits))
    && validCount(movement.certificateUnits) >= 0
    && Number.isSafeInteger(validCount(movement.merchUnits))
    && validCount(movement.merchUnits) >= 0
    && (movement.kind === "capture" || movement.kind === "refund");
}

/**
 * Produce the public aggregate. The input is already restricted to one fixed
 * seven-day query window; malformed movements remain visible as omissions.
 */
export function summarizeCommerce(
  days: readonly string[],
  timeZone: string,
  movements: readonly CommerceMovement[],
  initialOmittedRecords = 0,
): CommerceSummary {
  const daySet = new Set(days);
  const totals = new Map<string, Map<string, Totals>>();
  const seen = new Set<string>();
  let omittedRecords = initialOmittedRecords;

  for (const movement of movements) {
    if (!validMovement(movement) || seen.has(movement.id)) {
      omittedRecords += 1;
      continue;
    }
    seen.add(movement.id);
    const date = localDate(timeZone, new Date(movement.occurredAt));
    if (date === null) {
      omittedRecords += 1;
      continue;
    }
    if (!daySet.has(date)) continue;
    const currency = movement.currency.toUpperCase();
    const byCurrency = totals.get(date) ?? new Map<string, Totals>();
    totals.set(date, byCurrency);
    const current = byCurrency.get(currency) ?? {
      paidOrders: 0, grossMinor: 0, refundedMinor: 0, certificates: 0, merchUnits: 0, movements: 0,
    };
    const next = movement.kind === "capture"
      ? {
          paidOrders: safeAdd(current.paidOrders, 1),
          grossMinor: safeAdd(current.grossMinor, movement.amount),
          refundedMinor: current.refundedMinor,
          certificates: safeAdd(current.certificates, validCount(movement.certificateUnits)),
          merchUnits: safeAdd(current.merchUnits, validCount(movement.merchUnits)),
          movements: safeAdd(current.movements, 1),
        }
      : {
          paidOrders: current.paidOrders,
          grossMinor: current.grossMinor,
          refundedMinor: safeAdd(current.refundedMinor, movement.amount),
          certificates: current.certificates,
          merchUnits: current.merchUnits,
          movements: safeAdd(current.movements, 1),
        };
    if (Object.values(next).some((value) => value === null)) {
      omittedRecords += 1;
      continue;
    }
    byCurrency.set(currency, next as Totals);
  }

  const summaryDays = days.map((date) => {
    const rows = [...(totals.get(date)?.entries() ?? [])].sort(([left], [right]) => left.localeCompare(right));
    const kept = rows.slice(0, MAX_CURRENCIES_PER_DAY);
    for (const [, rejected] of rows.slice(MAX_CURRENCIES_PER_DAY)) omittedRecords += rejected.movements;
    return {
      date,
      currencies: kept.map(([currency, value]) => ({
        currency,
        paidOrders: value.paidOrders,
        grossMinor: value.grossMinor,
        refundedMinor: value.refundedMinor,
        netMinor: value.grossMinor - value.refundedMinor,
        certificates: value.certificates,
        merchUnits: value.merchUnits,
      })),
    };
  });
  const hasMovement = summaryDays.some((day) => day.currencies.length > 0);
  return {
    status: omittedRecords > 0 ? "incomplete" : hasMovement ? "available" : "empty",
    from: days[0] ?? "",
    through: days.at(-1) ?? "",
    omittedRecords,
    days: summaryDays,
  };
}

/** Exact tier identities shared with the order subscriber; titles are fallback evidence. */
export function isCertificateLine(handle: unknown, title: unknown): boolean {
  return PRODUCT_TIERS.some((tier) => tier.handle === handle || tier.title === title);
}

type Row = Record<string, unknown>;

function rows(value: unknown): readonly Row[] {
  return Array.isArray(value) ? value.filter((entry): entry is Row => entry !== null && typeof entry === "object") : [];
}

function row(value: unknown): Row | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function minor(raw: unknown, currency: string): number | null {
  const value = row(raw)?.value;
  const precision = REVIEWED_CURRENCY_PRECISION[currency.toUpperCase()];
  if (typeof value !== "string" || precision === undefined || !/^-?\d+(\.\d+)?$/.test(value)) return null;
  const negative = value.startsWith("-");
  const [whole, suppliedFraction = ""] = (negative ? value.slice(1) : value).split(".");
  // Medusa BigNumber serialisation retains its working precision. Zeros past
  // the currency scale do not change a minor-unit amount; nonzero digits do.
  const fraction = suppliedFraction.replace(/0+$/, "");
  if (fraction.length > precision || !/^\d*$/.test(fraction)) return null;
  const digits = `${whole}${fraction.padEnd(precision, "0")}`;
  const numeric = Number(digits);
  return Number.isSafeInteger(numeric) ? negative ? -numeric : numeric : null;
}

/** A capture/refund timestamp must be an actual instant, never a local date. */
function timestamp(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Accept the narrow BigNumber boundary Medusa's graph projection uses. */
function integer(value: unknown): number | null {
  const projected = row(value);
  // `raw_quantity` is authoritative when present. Do not fall through to a
  // synthesized quantity on malformed raw data: that would turn corrupt order
  // history into a plausible count.
  if (projected !== null && Object.hasOwn(projected, "value")) {
    const raw = projected.value;
    if (typeof raw !== "string" || !/^\d+(?:\.0+)?$/.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  const direct = typeof value === "number" ? value : undefined;
  const numeric = projected?.numeric;
  const fromNumeric = typeof numeric === "number" ? numeric : undefined;
  const valued = value !== null && typeof value === "object" && !Array.isArray(value) && typeof (value as { valueOf?: unknown }).valueOf === "function"
    ? (value as { valueOf(): unknown }).valueOf() : undefined;
  const candidate = direct ?? fromNumeric ?? (typeof valued === "number" ? valued : undefined);
  return candidate !== undefined && Number.isSafeInteger(candidate) ? candidate : null;
}

function countOrderLines(order: Row): { certificateUnits: number; merchUnits: number } | null {
  let certificateUnits = 0;
  let merchUnits = 0;
  for (const item of rows(order.items)) {
    if (item.variant_id === null) continue;
    const detail = row(item.detail);
    const quantity = integer(detail?.raw_quantity ?? detail?.quantity ?? item.raw_quantity ?? item.quantity);
    if (quantity === null || quantity < 0) return null;
    if (isCertificateLine(item.product_handle, item.title)) certificateUnits += quantity;
    else merchUnits += quantity;
  }
  return Number.isSafeInteger(certificateUnits) && Number.isSafeInteger(merchUnits) ? { certificateUnits, merchUnits } : null;
}

function corroborated(transactions: readonly Row[], reference: "capture" | "refund", id: string, minorAmount: number, currency: string): boolean {
  const matching = transactions.filter((transaction) => transaction.reference === reference && transaction.reference_id === id);
  return matching.length === 1
    && text(matching[0]?.currency_code)?.toLowerCase() === currency.toLowerCase()
    && minor(matching[0]?.raw_amount, currency) === minorAmount;
}

function indexedCollections(collections: readonly unknown[]): ReadonlyMap<string, Row | null> {
  const indexed = new Map<string, Row | null>();
  for (const value of collections) {
    const collection = row(value);
    const id = text(collection?.id);
    if (collection === null || id === null) continue;
    indexed.set(id, indexed.has(id) ? null : collection);
  }
  return indexed;
}

function linkedOrder(collection: Row, currency: string): Row | null {
  const order = row(collection.order);
  const orderCollections = order === null ? [] : rows(order.payment_collections);
  return order !== null
    && orderCollections.length === 1
    && orderCollections[0]?.id === collection.id
    && text(order.currency_code)?.toLowerCase() === currency
    && order.status !== "draft"
    && order.is_draft_order !== true
    ? order
    : null;
}

function uniqueById(values: readonly Row[], id: string): Row | null {
  const matches = values.filter((value) => value.id === id);
  return matches.length === 1 ? matches[0]! : null;
}

function sameInstant(value: unknown, expected: string): boolean {
  const actual = timestamp(value);
  return actual !== null && actual === timestamp(expected);
}

/** Convert only the discovered seven-day candidates into aggregate movements. */
export function classifyCommerceCollections(
  collections: readonly unknown[],
  candidates: readonly CommerceCandidate[],
  days: readonly string[],
  timeZone: string,
): {
  readonly movements: readonly CommerceMovement[];
  readonly omittedRecords: number;
} {
  const movements: CommerceMovement[] = [];
  let omittedRecords = 0;
  const daySet = new Set(days);
  const collectionById = indexedCollections(collections);
  const captureCandidatePayments = new Set(candidates.flatMap((candidate) =>
    candidate.kind === "capture" && candidate.paymentId !== null ? [candidate.paymentId] : []));

  for (const candidate of candidates) {
    if (candidate.kind === "payment") continue;
    const candidateDate = localDate(timeZone, new Date(candidate.occurredAt));
    const collection = candidate.collectionId === null ? null : collectionById.get(candidate.collectionId) ?? null;
    const currency = collection === null ? null : text(collection.currency_code)?.toLowerCase() ?? null;
    const order = collection === null || currency === null ? null : linkedOrder(collection, currency);
    const payments = collection === null ? [] : rows(collection.payments);
    const payment = candidate.paymentId === null || payments.length !== 1 ? null : uniqueById(payments, candidate.paymentId);
    const paymentCurrency = text(payment?.currency_code)?.toLowerCase();
    const event = payment === null ? null : uniqueById(rows(payment[candidate.kind === "capture" ? "captures" : "refunds"]), candidate.id);

    if (candidateDate === null || !daySet.has(candidateDate) || collection === null || currency === null
      || REVIEWED_CURRENCY_PRECISION[currency.toUpperCase()] === undefined || order === null || payment === null
      || paymentCurrency !== currency || event === null || !sameInstant(event.created_at, candidate.occurredAt)) {
      omittedRecords += 1;
      continue;
    }

    const amount = minor(event.raw_amount, currency);
    const transactions = rows(order.transactions);
    if (candidate.kind === "refund") {
      if (amount === null || amount <= 0 || !corroborated(transactions, "refund", candidate.id, -amount, currency)) omittedRecords += 1;
      else movements.push({ id: candidate.id, kind: "refund", occurredAt: candidate.occurredAt, currency, amount });
      continue;
    }

    const paymentAmount = minor(payment.raw_amount, currency);
    const captures = rows(payment.captures);
    const lines = order.version === 1 ? countOrderLines(order) : null;
    const fullyCaptured = payment.canceled_at === null && paymentAmount !== null && captures.length === 1 && amount === paymentAmount;
    if (!fullyCaptured || amount === null || amount <= 0 || lines === null || !corroborated(transactions, "capture", candidate.id, amount, currency)) omittedRecords += 1;
    else movements.push({ id: candidate.id, kind: "capture", occurredAt: candidate.occurredAt, currency, amount, ...lines });
  }

  for (const marker of candidates) {
    if (marker.kind !== "payment" || captureCandidatePayments.has(marker.id)) continue;
    const markerDate = localDate(timeZone, new Date(marker.capturedAt));
    const collection = marker.collectionId === null ? null : collectionById.get(marker.collectionId) ?? null;
    const payment = collection === null ? null : uniqueById(rows(collection.payments), marker.id);
    if (markerDate === null || !daySet.has(markerDate) || payment === null || !sameInstant(payment.captured_at, marker.capturedAt)) {
      omittedRecords += 1;
      continue;
    }
    const captures = rows(payment.captures);
    if (captures.length !== 1 || text(captures[0]?.id) === null) {
      omittedRecords += 1;
      continue;
    }
    const captureDate = localDate(timeZone, new Date(timestamp(captures[0]?.created_at) ?? Number.NaN));
    if (captureDate === null || daySet.has(captureDate)) omittedRecords += 1;
  }
  return { movements, omittedRecords };
}
