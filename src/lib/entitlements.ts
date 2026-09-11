// @polsia:user-owned — Launch MVP Phase C: the one place that decides
// whether a user has an active entitlement for a paid service. No payment
// provider creates Entitlement rows yet (see src/lib/payments/provider.ts
// and POST /api/entitlements/purchase, which always returns 501) — this
// helper simply reads what's there, so it works unchanged once a real
// provider starts writing rows.
import 'server-only';

import { prisma } from '@/lib/db';

// The MVP's only paid service: continuing a conversation past the free
// intro messages. scopeId is the conversationId — see FREE_MESSAGE_LIMIT
// below and the gating in conversations/[id]/messages/route.ts.
export const CONNECTION_MESSAGING_SERVICE = 'connection_messaging';

// How many messages a Conversation may exchange, in total, before a
// participant needs an active entitlement to send another one. Scoped to
// the conversation as a whole (not per-sender) — simplest MVP rule: the
// pair gets a short free trial of the conversation together, then either
// side unlocks continued messaging. Free browsing/interest/matching are
// never gated — only continuing to message past this point.
export const FREE_MESSAGE_LIMIT = 3;

/** True if `userId` has a currently-active (unexpired) entitlement for `service`, optionally scoped to one resource. */
export async function hasActiveEntitlement(
  userId: string,
  service: string,
  scopeId: string | null = null,
): Promise<boolean> {
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      service,
      scopeId,
      status: 'active',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return !!entitlement;
}
