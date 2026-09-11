// @polsia:user-owned — client-safe contract for Launch MVP Phase C
// (Payments/Entitlements). Keep free of Prisma/server-only imports.
import { z } from 'zod';

export const EntitlementCheckResponse = z.object({
  active: z.boolean(),
  // Only populated for service=connection_messaging with a scopeId
  // (conversationId) — null in every other case, including once `active`
  // is true (an unlocked conversation has no "remaining" count).
  freeMessagesRemaining: z.number().int().nonnegative().nullable(),
});
export type EntitlementCheckResponse = z.infer<typeof EntitlementCheckResponse>;

export const PurchaseRequest = z.object({
  service: z.string().trim().min(1, 'service is required'),
  scopeId: z.string().nullable().optional(),
});
export type PurchaseRequest = z.infer<typeof PurchaseRequest>;
