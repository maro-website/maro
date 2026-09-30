import "server-only";

/** V1 recovery release policy: environment flags cannot reopen purchases. */
export function legacyPaymentsEnabled(): boolean {
  return false;
}
