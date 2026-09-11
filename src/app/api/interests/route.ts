// @polsia:user-owned — Launch MVP: the minimum Express Interest backend.
// senderId is always requireAuthenticatedUser().id — never a
// client-supplied value. Duplicate interest and self-interest are both
// rejected here; this is intentionally NOT a Match/Messaging system (see
// the launch MVP scope) — it only records that interest was expressed.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { InterestWrite, toInterestItem } from '@/lib/contracts/interests';
import { prisma } from '@/lib/db';
import { emitNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const parsed = InterestWrite.safeParse(await request.json());
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

    const { targetDogId } = parsed.data;

    // Validate the target dog exists before anything else — a
    // nonexistent/typo'd id must never reach the duplicate/self-interest
    // checks below.
    const targetDog = await prisma.dogProfile.findUnique({ where: { id: targetDogId } });
    if (!targetDog) {
      return NextResponse.json({ error: 'Dog profile not found' }, { status: 404 });
    }

    if (targetDog.ownerId === user.id) {
      return NextResponse.json(
        { error: "You can't express interest in your own dog" },
        { status: 400 },
      );
    }

    const existing = await prisma.interest.findUnique({
      where: { senderId_targetDogId: { senderId: user.id, targetDogId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You've already expressed interest in this dog" },
        { status: 409 },
      );
    }

    const created = await prisma.interest.create({
      data: { senderId: user.id, targetDogId },
    });

    // Best-effort — never fails the request that created the interest.
    if (targetDog.ownerId) {
      await emitNotification(targetDog.ownerId, 'interest_received', {
        interestId: created.id,
        targetDogId,
      });
    }

    return NextResponse.json(toInterestItem(created), { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to express interest' }, { status: 500 });
  }
}
