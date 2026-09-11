// @polsia:user-owned — Launch MVP Phase A: interests other owners have
// sent toward ANY dog the current user owns. Scoped entirely to
// requireAuthenticatedUser().id — never a client-supplied ownerId.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { IncomingInterestList } from '@/lib/contracts/interests';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const interests = await prisma.interest.findMany({
      where: { targetDog: { ownerId: user.id } },
      include: { sender: true, targetDog: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      IncomingInterestList.parse({
        items: interests.map((interest) => ({
          id: interest.id,
          status: interest.status,
          createdAt: interest.createdAt.toISOString(),
          senderName: interest.sender.name,
          targetDogId: interest.targetDogId,
          targetDogName: interest.targetDog.name,
        })),
      }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load incoming interests' }, { status: 500 });
  }
}
