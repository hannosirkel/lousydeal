import type { EnvRecord } from "../config/env";

export class StoreClosedError extends Error {
  constructor() {
    super("store_closed");
    this.name = "StoreClosedError";
  }
}

/** Only the exact runtime value `true` permits a commerce mutation. */
export function readStoreOpen(environment: EnvRecord = process.env): boolean {
  return environment.STORE_OPEN?.trim() === "true";
}

/** Every Server Action calls this before reading caller input or Medusa state. */
export function assertStoreOpen(environment: EnvRecord = process.env): void {
  if (!readStoreOpen(environment)) throw new StoreClosedError();
}
