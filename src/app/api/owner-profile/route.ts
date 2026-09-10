// @polsia:user-owned — Phase 3: the authenticated owner's own profile.
// One row per session user, always scoped to requireAuthenticatedUser().id
// — never a client-supplied userId.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { OwnerProfileItem, OwnerProfileWrite } from '@/lib/contracts/owner-profile';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function fieldErrorsFrom(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  const fieldErrors = error.flatten().fieldErrors;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (message) {
      errors[field] = message;
    }
  }
  return errors;
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const profile = await prisma.ownerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 });
    }

    return NextResponse.json(OwnerProfileItem.parse(profile), { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load owner profile' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const existing = await prisma.ownerProfile.findUnique({ where: { userId: user.id } });
    if (existing) {
      return NextResponse.json(
        { error: 'Owner profile already exists. Use PATCH to update it.' },
        { status: 409 },
      );
    }

    const parsed = OwnerProfileWrite.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errors: fieldErrorsFrom(parsed.error) }, { status: 400 });
    }

    const created = await prisma.ownerProfile.create({
      data: { ...parsed.data, userId: user.id },
    });

    return NextResponse.json(OwnerProfileItem.parse(created), { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to create owner profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const existing = await prisma.ownerProfile.findUnique({ where: { userId: user.id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Owner profile not found. Use POST to create it first.' },
        { status: 404 },
      );
    }

    const parsed = OwnerProfileWrite.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errors: fieldErrorsFrom(parsed.error) }, { status: 400 });
    }

    const updated = await prisma.ownerProfile.update({
      where: { userId: user.id },
      data: parsed.data,
    });

    return NextResponse.json(OwnerProfileItem.parse(updated), { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to update owner profile' }, { status: 500 });
  }
}
