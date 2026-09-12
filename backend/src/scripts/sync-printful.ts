/**
 * Explicitly reconcile the selected Printful store to the committed catalogue.
 *
 * This file owns only the Medusa exec lifecycle. Product comparison and
 * mutation remain in `modules/printful/sync.ts`, so an operator command and
 * application code cannot drift into two reconciliation implementations.
 */

import type { ExecArgs } from "@medusajs/framework/types";

import { type Environment, ConfigError } from "../config/env";
import { printfulFulfilmentConfig } from "../config/fulfilment";
import { readBackendRuntimeConfig } from "../config/runtime";
import {
  createPrintfulClient,
  type PrintfulClient,
  type PrintfulClientOptions,
} from "../modules/printful/client";
import {
  syncMerchProducts,
  type SyncOptions,
  type SyncResult,
} from "../modules/printful/sync";

interface PrintfulSyncSummary {
  readonly mutations: number;
  readonly created: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly unrecognised: number;
}

interface PrintfulSyncLifecycle {
  readonly createClient: (options: PrintfulClientOptions) => PrintfulClient;
  readonly reconcile: (client: PrintfulClient, options: SyncOptions) => Promise<SyncResult>;
  readonly write: (line: string) => void;
}

const lifecycle: PrintfulSyncLifecycle = {
  createClient: createPrintfulClient,
  reconcile: syncMerchProducts,
  write: (line) => {
    process.stdout.write(`${line}\n`);
  },
};

const renderHandles = (label: string, handles: readonly string[]): string | null =>
  handles.length === 0 ? null : `${label}: ${handles.join(", ")}`;

/**
 * Run one reconciliation and return only its safe aggregate summary.
 *
 * `SyncResult.unrecognised` deliberately contains Printful-owned identifiers
 * for an operator examining code. They are counted here but never rendered:
 * the lifecycle's standard output is safe to retain in deployment logs.
 */
export async function runPrintfulSync(
  environment: Environment,
  port: PrintfulSyncLifecycle = lifecycle,
): Promise<PrintfulSyncSummary> {
  const selected = printfulFulfilmentConfig(readBackendRuntimeConfig(environment));
  if (selected === null) {
    throw new ConfigError("Printful sync requires PRINTFUL_API_TOKEN and PRINTFUL_ARTWORK_BASE_URL");
  }

  const result = await port.reconcile(
    port.createClient({ token: selected.apiToken }),
    { artworkBaseUrl: selected.artworkBaseUrl.replace(/\/+$/, "") },
  );
  const summary = {
    mutations: result.created.length + result.updated.length,
    created: result.created.length,
    updated: result.updated.length,
    unchanged: result.unchanged.length,
    unrecognised: result.unrecognised.length,
  };

  port.write(
    `Printful catalogue: mutations=${String(summary.mutations)} created=${String(summary.created)} ` +
      `updated=${String(summary.updated)} unchanged=${String(summary.unchanged)} ` +
      `unrecognised=${String(summary.unrecognised)}`,
  );
  for (const line of [
    renderHandles("created", result.created),
    renderHandles("updated", result.updated),
    renderHandles("unchanged", result.unchanged),
  ]) {
    if (line !== null) port.write(line);
  }

  return summary;
}

export default async function syncPrintful(_args: ExecArgs): Promise<void> {
  await runPrintfulSync(process.env);
}
