// @polsia:user-owned — client-safe contract for Launch MVP Phase D
// (Notifications). Keep free of Prisma/server-only imports.
import { z } from 'zod';

// A friendly, privacy-safe display message per event type. Computed
// server-side (see toNotificationItem below) so mobile never has to
// duplicate this business logic or infer meaning from a raw type string.
export function describeNotification(type: string): string {
  switch (type) {
    case 'interest_received':
      return 'Someone is interested in your dog';
    case 'interest_accepted':
      return 'Your interest was accepted';
    case 'match_created':
      return "You've got a new match!";
    case 'message_received':
      // Deliberately no message content — see the launch MVP scope
      // ("do not expose message contents in the notification").
      return 'You have a new message';
    default:
      return 'You have a new notification';
  }
}

export const NotificationEventItem = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  // Structural event data for navigation (e.g. conversationId,
  // interestId) — never message bodies or other sensitive content.
  payload: z.record(z.unknown()),
  read: z.boolean(),
  createdAt: z.string(),
});
export type NotificationEventItem = z.infer<typeof NotificationEventItem>;

export const NotificationEventList = z.object({ items: z.array(NotificationEventItem) });
export type NotificationEventList = z.infer<typeof NotificationEventList>;

// Shape of a Prisma NotificationEvent row — kept structural (no Prisma
// import) so this stays a client-importable module.
type NotificationEventRow = {
  id: string;
  type: string;
  payload: string; // JSON-encoded — see emitNotification in src/lib/notifications.ts
  read: boolean;
  createdAt: Date;
};

/** Converts a Prisma NotificationEvent row into the wire shape. Malformed/legacy payload JSON degrades to `{}` rather than failing the whole list. */
export function toNotificationItem(row: NotificationEventRow): NotificationEventItem {
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(row.payload);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    // Leave payload as {} — see doc comment above.
  }

  return NotificationEventItem.parse({
    id: row.id,
    type: row.type,
    message: describeNotification(row.type),
    payload,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  });
}
