/**
 * Change an issued certificate's inscription, without a reissue.
 *
 * **LD-11 F6.** §5 requires that an operator can sanitise, hide or blank an
 * inscription, and the certificate's render is derived from the stored fields
 * precisely so they can. Nothing implemented it. The repair on 2026-09-19 was
 * a hand-written `UPDATE` against the live database over `kubectl exec`, which
 * is not a route: it leaves no record of who changed what, it cannot be
 * reviewed, and the next person to need it starts from the same place.
 *
 *     npm run edit:inscription -- <serial> <display-name> <dedication>
 *
 * Both fields are given every time, and an empty argument blanks that field.
 * There is no partial update: an operator repairing an inscription is looking
 * at the certificate, and a command that silently leaves half of it alone is
 * how the wrong half survives. Blanking is the case §5 actually needs — an
 * inscription that cannot be emptied cannot be withdrawn, and a reissue would
 * change the serial, which is the one thing about a certificate that must not
 * move.
 *
 * **It writes through the deal module, not the table.** The service is the
 * store; a table write would bypass whatever the module later does on change
 * and would be the same defect as the SQL it replaces.
 *
 * **The serial, not the slug.** The slug is the certificate's public address
 * and §5 makes it the only thing between the document and the whole internet.
 * An operator repairing a certificate has the serial in front of them, and a
 * shell history is a place a slug would outlive its purpose.
 */

import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { DEAL_MODULE } from "../modules/deal";

export const EDIT_INSCRIPTION_USAGE =
  "Usage: npm run edit:inscription -- <serial> <display-name> <dedication>";

/** What this command changes, after the arguments have been read. */
export interface InscriptionEdit {
  readonly serial: number;
  /** `null` blanks the field. §5's sanitise-hide-or-blank. */
  readonly displayName: string | null;
  readonly dedication: string | null;
}

/**
 * The two generated methods this command uses, named narrowly.
 *
 * `MedusaService` puts the wide overloaded signatures on the service — filters,
 * config, context, arrays — and the seam is the shape this actually needs. The
 * same move `issue.ts` makes, for the same reason: a free function over two
 * methods can be driven through its interesting cases by a test with no
 * database.
 */
export interface InscriptionStore {
  listLousyDeals(filters: { readonly serial: number }): Promise<
    readonly { readonly id: string; readonly serial: number }[]
  >;
  updateLousyDeals(data: {
    readonly id: string;
    readonly display_name: string | null;
    readonly dedication: string | null;
  }): Promise<unknown>;
}

/** What the command reports. Never the inscription itself — see `editInscription`. */
export interface InscriptionEditResult {
  readonly id: string;
  readonly serial: number;
  readonly displayNameSet: boolean;
  readonly dedicationSet: boolean;
}

/**
 * Reads the three arguments, or refuses.
 *
 * A serial is a positive integer: `model.autoincrement()` starts at 1, and
 * `Number("")` is `0`, so the bound is checked rather than inferred.
 */
export function inscriptionEditFrom(args: readonly string[]): InscriptionEdit {
  if (args.length !== 3) throw new Error(EDIT_INSCRIPTION_USAGE);
  const [rawSerial, displayName, dedication] = args as readonly [string, string, string];
  const serial = Number(rawSerial);
  if (!Number.isInteger(serial) || serial < 1) throw new Error(EDIT_INSCRIPTION_USAGE);
  return {
    serial,
    displayName: displayName.length === 0 ? null : displayName,
    dedication: dedication.length === 0 ? null : dedication,
  };
}

/**
 * Finds the deal by serial and writes both fields.
 *
 * **The result names the row and not its contents.** An operator log is not a
 * place for a buyer's words, and §5's reason for this route existing is that
 * some of those words should not be anywhere — reprinting them into a log on
 * the way out would defeat the command.
 */
export async function editInscription(
  store: InscriptionStore,
  edit: InscriptionEdit,
): Promise<InscriptionEditResult> {
  const [deal] = await store.listLousyDeals({ serial: edit.serial });
  if (deal === undefined) throw new Error(`no deal with serial ${String(edit.serial)}`);

  await store.updateLousyDeals({
    id: deal.id,
    display_name: edit.displayName,
    dedication: edit.dedication,
  });

  return {
    id: deal.id,
    serial: edit.serial,
    displayNameSet: edit.displayName !== null,
    dedicationSet: edit.dedication !== null,
  };
}

export default async function editInscriptionCommand({ container, args }: ExecArgs): Promise<void> {
  // Read the arguments before resolving anything: a rejected invocation must
  // not reach the module at all, which is the same order `report-discounts`
  // uses and for the same reason.
  const edit = inscriptionEditFrom(args);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const deal = container.resolve(DEAL_MODULE) as unknown as InscriptionStore;

  const result = await editInscription(deal, edit);
  logger.info(
    `inscription updated for deal #${String(result.serial)} (${result.id}): ` +
      `display_name ${result.displayNameSet ? "set" : "blanked"}, ` +
      `dedication ${result.dedicationSet ? "set" : "blanked"}`,
  );
}
