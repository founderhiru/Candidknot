// @polsia:user-owned — Launch MVP Phase B: one conversation's detail +
// recent messages. Ownership/eligibility is entirely delegated to
// loadOwnedConversation — a missing conversation and one the caller isn't
// a participant of both return the same 404.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { ConversationDetail } from '@/lib/contracts/conversations';
import { ConversationAccessError, loadOwnedConversation } from '@/lib/conversation-ownership';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

// MVP: a single most-recent page, no cursor pagination yet — see the
// launch MVP scope ("basic pagination if necessary"). Fetched newest
// first then reversed, so the query only ever scans the tail of a long
// conversation rather than its full history.
const MESSAGE_PAGE_SIZE = 50;

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await params;

    const conversation = await loadOwnedConversation(id, user.id);

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE_SIZE,
    });
    // Chronological (oldest -> newest) for a top-to-bottom message list.
    const messages = recentMessages.reverse();

    const isSender = conversation.match.senderId === user.id;
    const other = isSender ? conversation.match.receiver : conversation.match.sender;

    return NextResponse.json(
      ConversationDetail.parse({
        id: conversation.id,
        matchId: conversation.matchId,
        targetDogId: conversation.match.targetDogId,
        targetDogName: conversation.match.targetDog.name,
        otherUserName: other.name,
        messages: messages.map((message) => ({
          id: message.id,
          body: message.body,
          senderId: message.senderId,
          isMine: message.senderId === user.id,
          createdAt: message.createdAt.toISOString(),
        })),
      }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof ConversationAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load conversation' }, { status: 500 });
  }
}
