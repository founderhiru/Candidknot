// @polsia:user-owned — Launch MVP Phase A: accept/decline an incoming
// Interest. Only the TARGET DOG'S OWNER may act on it — ownership is
// derived from requireAuthenticatedUser() + the interest's targetDog,
// never a client-supplied value. A missing interest or one belonging to a
// dog the caller doesn't own both respond 404 (never 401/403), matching
// the loadOwnedDog convention elsewhere in this codebase.
//
// Accepting is the "reciprocal condition" for launch: mutual consent
// (sender expressed interest, receiver accepted) creates a Match and its
// Conversation in one transaction — see prisma/schema/match.prisma.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { InterestStatusUpdate, toInterestItem } from '@/lib/contracts/interests';
import { prisma } from '@/lib/db';
import { emitNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await params;

    const interest = await prisma.interest.findUnique({
      where: { id },
      include: { targetDog: true },
    });
    if (!interest || interest.targetDog.ownerId !== user.id) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 });
    }

    const parsed = InterestStatusUpdate.safeParse(await request.json());
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errors: Record<string, string> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const message = messages?.[0];
        if (message) {
          errors[field] = message;
        }
      }
      return NextResponse.json({ errors }, { status: 400 });
    }

    if (interest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This interest has already been responded to' },
        { status: 409 },
      );
    }

    const { status } = parsed.data;

    if (status === 'declined') {
      const updated = await prisma.interest.update({
        where: { id },
        data: { status: 'declined' },
      });
      return NextResponse.json(toInterestItem(updated), { status: 200 });
    }

    // status === 'accepted' — create the Match + Conversation atomically so
    // an accepted interest is never left without one.
    const [updated] = await prisma.$transaction([
      prisma.interest.update({ where: { id }, data: { status: 'accepted' } }),
      prisma.match.create({
        data: {
          interestId: interest.id,
          senderId: interest.senderId,
          receiverId: user.id,
          targetDogId: interest.targetDogId,
          conversation: { create: {} },
        },
      }),
    ]);

    await emitNotification(interest.senderId, 'interest_accepted', {
      interestId: interest.id,
      targetDogId: interest.targetDogId,
    });
    await emitNotification(user.id, 'match_created', { interestId: interest.id });
    await emitNotification(interest.senderId, 'match_created', { interestId: interest.id });

    return NextResponse.json(toInterestItem(updated), { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to update interest' }, { status: 500 });
  }
}
