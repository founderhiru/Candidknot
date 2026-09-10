// @polsia:user-owned — Phase 3: the authenticated owner's own dog list.
// Scoped to ownerId = the server-derived session user's id — never a
// client-supplied id. Distinct from the public /api/dog-profiles GET,
// which is unauthenticated and returns everyone's discoverable profiles.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { OwnedDogProfileList } from '@/lib/contracts/dog-profiles';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const profiles = await prisma.dogProfile.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const payload = OwnedDogProfileList.parse({ items: profiles });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load your dog profiles' }, { status: 500 });
  }
}
