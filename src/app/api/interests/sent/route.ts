// @polsia:user-owned — Launch MVP Phase A: interests the current user has
// sent. Scoped entirely to requireAuthenticatedUser().id.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { OutgoingInterestList } from '@/lib/contracts/interests';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const interests = await prisma.interest.findMany({
      where: { senderId: user.id },
      include: { targetDog: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      OutgoingInterestList.parse({
        items: interests.map((interest) => ({
          id: interest.id,
          status: interest.status,
          createdAt: interest.createdAt.toISOString(),
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
    return NextResponse.json({ error: 'Unable to load outgoing interests' }, { status: 500 });
  }
}
