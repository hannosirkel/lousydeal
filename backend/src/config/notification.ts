/**
 * Registering the SMTP notification provider, in the shape `./payment.ts`,
 * `./redis.ts` and `./deal.ts` all take.
 *
 * **The module is registered only when mail is configured**, which is why this
 * returns `null` rather than always returning a module. See
 * `./runtime.ts`'s `readSmtpRuntimeConfig` for the whole of that reasoning: a
 * deployment with no mail credentials must boot, because both environments are
 * one today and C10/C11 are the rows that supply them.
 */

import { SMTP_NOTIFICATION_PROVIDER_ID } from "../notifications/smtp";
import type { BackendRuntimeConfig } from "./runtime";

type SmtpConfig = NonNullable<BackendRuntimeConfig["smtp"]>;

/** The path Medusa resolves, against the directory the process was started in -- see `./deal.ts`. */
export const NOTIFICATION_PROVIDER_PATH = "./src/notifications";

export function notificationModule(config: SmtpConfig | null) {
  if (config === null) return null;

  return {
    resolve: "@medusajs/medusa/notification",
    options: {
      providers: [
        {
          resolve: NOTIFICATION_PROVIDER_PATH,
          id: SMTP_NOTIFICATION_PROVIDER_ID,
          // `channels` is what Medusa routes on: a notification sent to the
          // `email` channel reaches this provider and nothing else does.
          options: { ...config, channels: ["email"] },
        },
      ],
    },
  } as const;
}
