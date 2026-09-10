// @polsia:user-owned — Phase 3: owner-only view/edit of a single dog
// profile by id. The dog is always loaded from the DB first, then
// requireResourceOwner() checks the loaded row's ownerId against the
// server-derived session user — the :id in the URL never determines
// ownership by itself, so an attacker cannot IDOR their way into another
// owner's dog by guessing/changing the id.
//
// SECURITY CORRECTION (post-approval): the ownership check still runs on
// every request (requireResourceOwner is never skipped), but its failure
// is surfaced as the SAME 404 response used for a nonexistent id — not a
// 401/403 — so a caller who is not the owner (including an unauthenticated
// one) cannot distinguish "this id doesn't exist" from "this id exists but
// isn't yours". Both cases return the identical body and status.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireResourceOwner } from '@/lib/auth';
import { DogProfileWrite, OwnedDogProfileItem } from '@/lib/contracts/dog-profiles';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

// Single not-found response used for BOTH a missing id and an id owned by
// someone else — same status, same body, so the two are indistinguishable
// to the caller.
function notFoundResponse() {
  return NextResponse.json({ error: 'Dog profile not found' }, { status: 404 });
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dog = await prisma.dogProfile.findUnique({ where: { id } });
    if (!dog) {
      return notFoundResponse();
    }

    try {
      await requireResourceOwner(dog.ownerId);
    } catch (err) {
      if (err instanceof AuthError) {
        return notFoundResponse();
      }
      throw err;
    }

    return NextResponse.json(OwnedDogProfileItem.parse(dog), { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Unable to load dog profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dog = await prisma.dogProfile.findUnique({ where: { id } });
    if (!dog) {
      return notFoundResponse();
    }

    try {
      await requireResourceOwner(dog.ownerId);
    } catch (err) {
      if (err instanceof AuthError) {
        return notFoundResponse();
      }
      throw err;
    }

    const parsed = DogProfileWrite.safeParse(await request.json());
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

    // slug/ownerId are intentionally excluded from DogProfileWrite, so this
    // update can never move ownership or the public URL, whatever the
    // client sends.
    const updated = await prisma.dogProfile.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(OwnedDogProfileItem.parse(updated), { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Unable to update dog profile' }, { status: 500 });
  }
}
