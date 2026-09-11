// @polsia:user-owned — Launch MVP Phase A: the current user's matches,
// whichever side of the original interest they were on. Scoped entirely
// to requireAuthenticatedUser().id — never a client-supplied userId.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { MatchList } from '@/lib/contracts/matches';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const matches = await prisma.match.findMany({
      where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
      include: { sender: true, receiver: true, targetDog: true, conversation: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      MatchList.parse({
        items: matches.map((match) => {
          const isSender = match.senderId === user.id;
          const other = isSender ? match.receiver : match.sender;
          return {
            id: match.id,
            // conversation is always created alongside the match in the
            // same transaction (see interests/[id]/route.ts) — never null.
            conversationId: match.conversation?.id ?? '',
            targetDogId: match.targetDogId,
            targetDogName: match.targetDog.name,
            otherUserName: other.name,
            status: match.status,
            createdAt: match.createdAt.toISOString(),
          };
        }),
      }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load matches' }, { status: 500 });
  }
}
