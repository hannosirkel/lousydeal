/**
 * Route middleware, and there is exactly one rule.
 *
 * **`preserveRawBody` for the Printful webhook and for nothing else.** A
 * signature is over bytes: `JSON.parse` then `JSON.stringify` moves whitespace,
 * unescapes `\/` and resolves unicode escapes, so a route verifying the parsed
 * body would refuse every genuine event. Medusa keeps the raw body only where
 * a route asks — `framework/dist/http/middlewares/bodyparser.js` passes
 * `verify` to the parser only when the option is set — and its own payment
 * hook does the same thing at `medusa/dist/api/hooks/middlewares.js`.
 *
 * Scoped to the one path deliberately. Preserving the raw body everywhere
 * would keep a second copy of every request in memory for the benefit of one.
 */

import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

export const PostStoreCartSurcharge = z.object({ code: z.string().trim().min(1).max(64) }).strict();

export default defineMiddlewares({
  routes: [
    {
      matcher: "/webhooks/printful",
      method: "POST",
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/store/carts/:id/surcharge",
      method: "POST",
      middlewares: [validateAndTransformBody(PostStoreCartSurcharge)],
    },
  ],
});
