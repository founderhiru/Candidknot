// @polsia:user-owned — Launch MVP Phase D: read-only(ish) notification
// feed. Scoped entirely to requireAuthenticatedUser().id — never a
// client-supplied userId. No push infrastructure — this is the whole
// notification surface for now (see src/lib/notifications.ts).
//
// Read-state: viewing this feed marks every currently-unread event as
// read, in the same request — the simplest safe way to make the existing
// `read` column meaningful without a separate mark-as-read endpoint or
// any extra mobile UI. The response reflects each item's read state AS
// OF THE START of this request, so the caller still sees which ones were
// new since their last visit.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { NotificationEventList, toNotificationItem } from '@/lib/contracts/notifications';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const events = await prisma.notificationEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const items = events.map(toNotificationItem);

    const unreadIds = events.filter((event) => !event.read).map((event) => event.id);
    if (unreadIds.length > 0) {
      try {
        await prisma.notificationEvent.updateMany({
          where: { id: { in: unreadIds }, userId: user.id },
          data: { read: true },
        });
      } catch {
        // Best-effort — a failed mark-as-read must never prevent the
        // caller from seeing their notifications.
      }
    }

    return NextResponse.json(NotificationEventList.parse({ items }), { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load notifications' }, { status: 500 });
  }
}
