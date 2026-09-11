// @polsia:user-owned — Launch MVP Phase C: read-only entitlement check.
// Always checked against requireAuthenticatedUser().id — a caller can
// only ever ask "do I have this?", never "does user X have this?".
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { EntitlementCheckResponse } from '@/lib/contracts/entitlements';
import { ConversationAccessError, loadOwnedConversation } from '@/lib/conversation-ownership';
import { prisma } from '@/lib/db';
import {
  CONNECTION_MESSAGING_SERVICE,
  FREE_MESSAGE_LIMIT,
  hasActiveEntitlement,
} from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const scopeId = searchParams.get('scopeId');

    if (!service) {
      return NextResponse.json({ error: 'service is required' }, { status: 400 });
    }

    const active = await hasActiveEntitlement(user.id, service, scopeId);

    let freeMessagesRemaining: number | null = null;
    if (service === CONNECTION_MESSAGING_SERVICE && scopeId) {
      // Ownership-check the conversation before counting anything in it —
      // this endpoint must never be usable to probe another user's
      // conversation, even just for a message count.
      try {
        await loadOwnedConversation(scopeId, user.id);
      } catch (err) {
        if (err instanceof ConversationAccessError) {
          return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }
        throw err;
      }
      if (!active) {
        const sentCount = await prisma.message.count({ where: { conversationId: scopeId } });
        freeMessagesRemaining = Math.max(0, FREE_MESSAGE_LIMIT - sentCount);
      }
    }

    return NextResponse.json(EntitlementCheckResponse.parse({ active, freeMessagesRemaining }), {
      status: 200,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to check entitlement' }, { status: 500 });
  }
}
