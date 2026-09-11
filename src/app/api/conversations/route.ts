// @polsia:user-owned — Launch MVP Phase B: the current user's
// conversations, whichever side of the Match they were on. Scoped
// entirely to requireAuthenticatedUser().id — never a client-supplied
// userId. Only conversations on an "active" Match are listed — see
// src/lib/conversation-ownership.ts for why that check exists.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { ConversationList } from '@/lib/contracts/conversations';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const conversations = await prisma.conversation.findMany({
      where: {
        match: {
          status: 'active',
          OR: [{ senderId: user.id }, { receiverId: user.id }],
        },
      },
      include: {
        match: { include: { sender: true, receiver: true, targetDog: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(
      ConversationList.parse({
        items: conversations.map((conversation) => {
          const isSender = conversation.match.senderId === user.id;
          const other = isSender ? conversation.match.receiver : conversation.match.sender;
          const lastMessage = conversation.messages[0];
          return {
            id: conversation.id,
            matchId: conversation.matchId,
            targetDogId: conversation.match.targetDogId,
            targetDogName: conversation.match.targetDog.name,
            otherUserName: other.name,
            lastMessageBody: lastMessage?.body ?? null,
            lastMessageAt: lastMessage?.createdAt.toISOString() ?? null,
            updatedAt: conversation.updatedAt.toISOString(),
          };
        }),
      }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load conversations' }, { status: 500 });
  }
}
