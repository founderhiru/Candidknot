// @polsia:user-owned — Launch MVP Phase D: the one place that writes a
// NotificationEvent row. No push credentials/infrastructure exist yet —
// this only records that an event happened, for a future phase (or a
// future in-app notifications screen) to read. Callers should never let a
// notification failure break the request that triggered it — see the
// try/catch usage at each call site.
import 'server-only';

import { prisma } from '@/lib/db';

export type NotificationType =
  | 'interest_received'
  | 'interest_accepted'
  | 'match_created'
  | 'message_received';

/** Records that `type` happened for `userId`. Never throws — a notification-log failure must never fail the request that triggered it. */
export async function emitNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.notificationEvent.create({
      data: { userId, type, payload: JSON.stringify(payload) },
    });
  } catch {
    // Best-effort. The triggering action (interest/match/message) already
    // succeeded and must not be rolled back or fail because logging did.
  }
}
