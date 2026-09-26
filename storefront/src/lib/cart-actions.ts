"use server";

/**
 * The one Server Action that puts a tier in a cart.
 *
 * **It was two.** The home page and the tier page each defined a
 * byte-identical copy — the same cookie name, the same four cookie attributes,
 * the same reuse-or-create, the same quantity, the same redirect — and nothing
 * kept them in step. Two Gate D reviews flagged it; the second pointed out
 * that the objection to sharing (that a `"use server"` module would couple two
 * routes) did not survive the fact that both routes already imported
 * `CART_ID_COOKIE` from the home page's route module.
 *
 * A `"use server"` module may export only async functions, which is why the
 * cookie name and its attributes are in `./store-session` rather than here.
 *
 * **Every export of this file is a POST endpoint.** Next gives each one a
 * public action id, so anything exported here is reachable by any visitor with
 * any arguments. That is why this module exports only actions, and why every
 * one reads only the field its form owns and validates its shape.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { FetchJson } from "./medusa-client";
import { createStoreFetchJson, getDefaultRegion, listTiers, StoreApiError } from "./medusa-client";
import { addLineToCart, applySurcharge, createCart, getCart, removeLineFromCart } from "./store-cart";
import { CART_COOKIE_OPTIONS, CART_ID_COOKIE, requireStoreClientConfig } from "./store-session";
import { assertStoreOpen } from "./store-availability";

type CartLines = Awaited<ReturnType<typeof getCart>>["items"];

/**
 * The cart this add goes into: the one the cookie names, or a new one.
 *
 * **Three ways the cookie's cart is unusable**, and only the first was handled
 * before C3a:
 *
 *  - there is no cookie;
 *  - it names a cart that no longer resolves. Nothing expires a cart here, but
 *    a database restored to an earlier point, a cookie carried between
 *    environments, or a hand-edited value all produce one. Until now this
 *    threw out of the Server Action, and a visitor got an error page for
 *    clicking a button;
 *  - **it names a cart that has already been paid for.** Nothing clears the
 *    cookie at checkout and nothing could — it is `httpOnly`, so the Client
 *    Component that knows the order succeeded cannot reach it. A visitor
 *    buying a second certificate arrives here holding the cart they already
 *    bought, whose lines can no longer be changed.
 */
async function cartToAddTo(
  fetchJson: FetchJson,
  existingCartId: string | undefined,
  clear: (variantId: string | null) => boolean,
  alreadyHolds: (items: NonNullable<CartLines>) => boolean = () => false,
): Promise<{ readonly id: string; readonly items: CartLines; readonly unchanged: boolean }> {
  if (existingCartId !== undefined) {
    try {
      const cart = await getCart(fetchJson, existingCartId);
      if (cart.completed_at == null) {
        if (alreadyHolds(cart.items ?? [])) return { id: cart.id, items: cart.items, unchanged: true };
        for (const line of (cart.items ?? []).filter((item) => clear(item.variant_id))) {
          // Sequential, not `Promise.all`: these are writes to one cart and
          // Medusa refetches and recomputes it on each.
          await removeLineFromCart(fetchJson, cart.id, line.id);
        }
        return { id: cart.id, items: cart.items, unchanged: false };
      }
    } catch {
      // Not rethrown, and not logged with the id -- a cart id is a bearer
      // token for that cart's contents. The recovery is the same whatever the
      // cause, so telling the causes apart earns nothing.
    }
  }
  return { id: (await createCart(fetchJson, (await getDefaultRegion(fetchJson)).id)).id, items: [], unchanged: false };
}

/**
 * Puts one certificate in the visitor's cart, replacing whatever was in it,
 * and sends them to it.
 *
 * **One certificate per order, made true here.** Contract §16 gives a deal one
 * `order_id` and no line reference, so an order for two things has no single
 * tier and no single price to certify — C2's subscriber refuses to issue for
 * one rather than print a transaction that did not happen. This is the row
 * that keeps the cart out of that state: every existing line goes before the
 * chosen one arrives, so clicking two tiers means the second, and clicking one
 * tier twice means one.
 *
 * That is also what the buyer means. The three tiers are a choice between
 * things that deliver the same nothing (§4.1); pressing "add" on a second one
 * is changing your mind, not ordering a pair.
 *
 * **It is not a security boundary.** `POST /store/carts/:id/line-items` is
 * public, so a visitor who wants a two-line cart can have one. What this stops
 * is an honest buyer reaching checkout in a state that cannot be certified —
 * `checkout/page.tsx` then refuses to take money in it, and C2's subscriber
 * refuses to certify it.
 *
 * The quantity is one and is not read from the form: nothing on this site
 * offers a quantity control, and a field the browser can set is a field a
 * visitor can set to something else.
 *
 * **It used to clear every line, and LD-04 made that wrong.** "Replace what is
 * in the cart" and "keep at most one certificate" were the same sentence while
 * a certificate was the only thing sold. They are not now: a buyer with a mug
 * in the cart who changes their mind about which tier they want would have
 * had the mug silently deleted — a paid-for intention removed by a control
 * that says `ACQUIRE`, with nothing on the page saying so.
 *
 * So only the certificates go. Which variants those are comes from
 * `listTiers`, which is the same list `checkout/page.tsx` derives its rules
 * from and, since P9a, the one that actually excludes merch.
 *
 * **Pressing the tier the cart already holds changes nothing, and says so.**
 * LD-11 J6 (G2's finding 7): the second press used to clear the certificate,
 * add it back and re-price the surcharge to the figure it already had, then
 * land on a cart that looked exactly as before with no word about why. A
 * buyer who pressed twice because the first press seemed not to work could
 * not tell what happened. Now a cart holding exactly that one certificate,
 * and a surcharge no more than once at a quantity of one, is not written to
 * at all, and the cart says so in the words a wrong code gets. Any other
 * shape takes the ordinary path, because clearing and re-adding is what
 * repairs it.
 */
export async function addToCart(formData: FormData): Promise<void> {
  assertStoreOpen();
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") {
    throw new Error("addToCart: missing variantId");
  }

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const cookieStore = await cookies();
  const certificates = new Set((await listTiers(fetchJson)).map((tier) => tier.variantId));
  const isCertificate = (id: string | null) => id !== null && certificates.has(id);
  const cart = await cartToAddTo(
    fetchJson,
    cookieStore.get(CART_ID_COOKIE)?.value,
    isCertificate,
    (items) => {
      const held = items.filter((line) => isCertificate(line.variant_id));
      const surcharge = items.filter((line) => line.variant_id === null);
      return held.length === 1 && held[0]?.variant_id === variantId && held[0].quantity === 1
        && surcharge.length <= 1 && surcharge.every((line) => line.quantity === 1);
    },
  );
  if (cart.unchanged) {
    cookieStore.set(CART_ID_COOKIE, cart.id, CART_COOKIE_OPTIONS);
    redirect("/cart?acquire_reason=already_in_cart");
  }
  const surcharges = (cart.items ?? []).filter((line) => line.variant_id === null);
  const code = surcharges.length === 1 && typeof surcharges[0]?.metadata?.["code"] === "string"
    ? surcharges[0].metadata["code"]
    : null;
  await addLineToCart(fetchJson, cart.id, variantId, 1);

  if (code !== null) {
    try {
      await applySurcharge(fetchJson, cart.id, code);
    } catch {
      for (const surcharge of surcharges) await removeLineFromCart(fetchJson, cart.id, surcharge.id);
    }
  } else {
    for (const surcharge of surcharges) await removeLineFromCart(fetchJson, cart.id, surcharge.id);
  }

  cookieStore.set(CART_ID_COOKIE, cart.id, CART_COOKIE_OPTIONS);
  redirect("/cart");
}

/**
 * Puts one printed thing in the cart, keeping everything already in it.
 *
 * **It clears nothing, and that is the whole difference from `addToCart`.**
 * Adding a mug is not changing your mind about which mug; a buyer who wants a
 * shirt and a cap wants both. The one-certificate rule is `addToCart`'s and
 * stays there — nothing here can create a second certificate, because nothing
 * here adds a certificate.
 *
 * **It does not validate that the variant is merch, and could not usefully.**
 * `POST /store/carts/:id/line-items` is public, so anything this refuses is
 * reachable anyway; what actually holds the line is `isPayableCart`, which
 * refuses a cart with two certificates however they arrived. This is the same
 * disposition `addToCart` records: not a security boundary, a way of keeping
 * an honest buyer out of a state that cannot be certified.
 *
 * The quantity is one and is not read from the form, for `addToCart`'s reason.
 * A buyer who wants two mugs presses the control twice, and Medusa merges the
 * lines.
 */
export async function addMerchToCart(formData: FormData, redirectAfter = true): Promise<void> {
  assertStoreOpen();
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") {
    throw new Error("addMerchToCart: missing variantId");
  }

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const cookieStore = await cookies();
  const cart = await cartToAddTo(fetchJson, cookieStore.get(CART_ID_COOKIE)?.value, () => false);
  await addLineToCart(fetchJson, cart.id, variantId, 1);

  cookieStore.set(CART_ID_COOKIE, cart.id, CART_COOKIE_OPTIONS);
  if (redirectAfter !== false) redirect("/cart");
}

type SurchargeRefusalReason = "unknown_code" | "no_certificate" | "completed";

type SurchargeLineShape = { readonly title: string; readonly unitPrice: number };

/**
 * The cart's one surcharge line, as the buyer sees it, or `null` for none,
 * more than one, one at a quantity above one, or one with no title.
 *
 * A line with no title is not compared, because two codes can land on the
 * same price -- `FREE` and `BALDRICK20` add the same dollar to Standard -- and
 * the title is the only thing that tells them apart.
 *
 * The title and the price are what the ledger prints for it, so two readings
 * that agree on both are, to the buyer, the same line. The title is written
 * server-side from the normalised code (`surcharge.ts`), so a code typed
 * again in another case or with spaces reads as the same line, which it is.
 */
function onlySurcharge(items: CartLines): SurchargeLineShape | null {
  const surcharges = (items ?? []).filter((line) => line.variant_id === null);
  const [line] = surcharges;
  if (surcharges.length !== 1 || line === undefined || line.quantity !== 1) return null;
  if (typeof line.title !== "string" || line.title.length === 0) return null;
  return { title: line.title, unitPrice: line.unit_price };
}

function surchargeRefusalReason(error: unknown): SurchargeRefusalReason | null {
  if (!(error instanceof StoreApiError) || error.status !== 422) return null;
  const body = error.body;
  if (typeof body !== "object" || body === null || !("reason" in body)) return null;
  const reason = body.reason;
  return reason === "unknown_code" || reason === "no_certificate" || reason === "completed" ? reason : null;
}

/**
 * Apply one code to the cart named by the caller's private cart cookie.
 *
 * **A code already applied is answered, like a wrong one.** LD-11 J6 (G2's
 * finding 3): applying `BALDRICK20` a second time produced no text at all,
 * while `NOTACODE` was told it was not on file. The backend still does what
 * it always did with a repeat -- replaces the line with an identical one --
 * and this compares what the ledger showed before with what it shows after.
 * Where the one surcharge line reads the same, the buyer is told the code is
 * already applied, and nothing in the cart changed. That is measured, not
 * inferred from the code's spelling, so it cannot say "nothing changed" of a
 * cart whose line was re-priced or de-duplicated by the call.
 *
 * It redirects even for an enhanced submission, as a refusal does, so the
 * answer is shown rather than a silent refresh, and a code that was already
 * applied is not counted as accepted a second time.
 */
export async function applyCode(formData: FormData, redirectAfter = true): Promise<void> {
  assertStoreOpen();
  const code = formData.get("code");
  if (typeof code !== "string") {
    throw new Error("applyCode: missing code");
  }

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_ID_COOKIE)?.value;
  if (cartId === undefined) redirect("/cart?code_reason=no_certificate");

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  let before: SurchargeLineShape | null = null;
  try {
    before = onlySurcharge((await getCart(fetchJson, cartId)).items);
  } catch {
    // Not knowing what was there only costs the notice, never the code: the
    // apply below still answers for the cart. Not logged, for `cartToAddTo`'s
    // reason.
  }
  let after: SurchargeLineShape | null;
  try {
    after = onlySurcharge((await applySurcharge(fetchJson, cartId, code)).items);
  } catch (error) {
    const reason = surchargeRefusalReason(error);
    if (reason === null) throw error;
    redirect(`/cart?code_reason=${reason}`);
  }
  if (before !== null && after !== null && before.title === after.title && before.unitPrice === after.unitPrice) {
    redirect("/cart?code_reason=already_applied");
  }
  if (redirectAfter !== false) redirect("/cart");
}

/**
 * Take one line back out of the cart.
 *
 * **`removeLineFromCart` has existed since C-something and no page ever
 * offered it.** A buyer who added a mug to see what would happen could not
 * undo it, which turns an upsell into a trap: the only exits were completing
 * the order or abandoning the cart.
 *
 * It refuses to remove the last certificate, and that is not paternalism.
 * `isPayableCart` requires exactly one — merch is an upsell, settled by the
 * operator on 2026-09-09 — so a cart stripped of its certificate is one the
 * pay control will silently refuse, with nothing on the page saying why.
 * Better to keep the one line the cart is *for* and let the buyer abandon it,
 * which they can already do by leaving.
 *
 * Missing or stale ids are not errors. Two clicks on one control, a stale
 * page, a back button: the buyer's intent is "this should not be in my cart",
 * and it is already not.
 */
export async function removeFromCart(formData: FormData): Promise<void> {
  assertStoreOpen();
  const lineId = formData.get("lineId");
  if (typeof lineId !== "string") {
    throw new Error("removeFromCart: missing lineId");
  }

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_ID_COOKIE)?.value;
  if (cartId === undefined) redirect("/cart");

  try {
    const cart = await getCart(fetchJson, cartId);
    const line = (cart.items ?? []).find((item) => item.id === lineId);
    // Already gone, or never in this cart. Either way the buyer's intent is
    // satisfied and there is nothing to say.
    if (line !== undefined) await removeLineFromCart(fetchJson, cartId, line.id);
  } catch {
    // Same disposition as `cartToAddTo`: the recovery is the same whatever
    // the cause, and a cart id is a bearer token that does not belong in a
    // log line.
  }

  redirect("/cart");
}
