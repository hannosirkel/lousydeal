/**
 * The notification provider module.
 *
 * Registered by local path in `src/config/notification.ts`, which is where the
 * resolve string is justified.
 */

import { ModuleProvider, Modules } from "@medusajs/framework/utils";

// Extensionless -- see the note in `../modules/deal/service`, and the
// reference project's own record of the same failure in
// `plepic/backend/src/modules/omniva/index.ts`.
import SmtpNotificationProvider from "./smtp";

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SmtpNotificationProvider],
});
