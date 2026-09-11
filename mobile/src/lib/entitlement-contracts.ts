// Mobile — client-side mirror of the backend's entitlement contract
// (src/lib/contracts/entitlements.ts). Not a new API — describes the
// exact shapes /api/entitlements/* already return.
import { z } from "zod";

export const CONNECTION_MESSAGING_SERVICE = "connection_messaging";

export const EntitlementCheckResponse = z.object({
  active: z.boolean(),
  freeMessagesRemaining: z.number().int().nonnegative().nullable(),
});
export type EntitlementCheckResponse = z.infer<typeof EntitlementCheckResponse>;
