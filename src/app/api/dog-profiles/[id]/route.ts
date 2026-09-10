// @polsia:user-owned — Phase 3: owner-only view/edit of a single dog
// profile by id. Ownership is enforced by @/lib/dog-ownership's
// loadOwnedDog(), which loads the row, runs requireResourceOwner(), and
// throws NotFoundError (mapped to 404 below) for BOTH a missing id and an
// id owned by someone else — the two are indistinguishable to the caller,
// per the Phase 3 security correction. requireResourceOwner still runs on
// every request; only the response is unified with not-found.
//
// Phase 4 extends the GET response with photos + healthRecords, both
// loaded via the same ownership-checked dog row — no separate auth path.
import 'server-only';

import { NextResponse } from 'next/server';
import { DogProfileWrite, OwnedDogProfileItem } from '@/lib/contracts/dog-profiles';
import { toHealthRecordItem } from '@/lib/contracts/health-records';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const dog = await loadOwnedDog(id);

    const [photos, healthRecords] = await Promise.all([
      prisma.dogPhoto.findMany({ where: { dogId: id }, orderBy: { position: 'asc' } }),
      prisma.healthRecord.findMany({
        where: { dogId: id },
        include: { documents: true },
        orderBy: { occurredOn: 'desc' },
      }),
    ]);

    return NextResponse.json(
      OwnedDogProfileItem.parse({
        ...dog,
        photos: photos.map((photo) => ({ id: photo.id, url: photo.url, position: photo.position })),
        healthRecords: healthRecords.map(toHealthRecordItem),
      }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load dog profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await loadOwnedDog(id);

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

    const [photos, healthRecords] = await Promise.all([
      prisma.dogPhoto.findMany({ where: { dogId: id }, orderBy: { position: 'asc' } }),
      prisma.healthRecord.findMany({
        where: { dogId: id },
        include: { documents: true },
        orderBy: { occurredOn: 'desc' },
      }),
    ]);

    return NextResponse.json(
      OwnedDogProfileItem.parse({
        ...updated,
        photos: photos.map((photo) => ({ id: photo.id, url: photo.url, position: photo.position })),
        healthRecords: healthRecords.map(toHealthRecordItem),
      }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to update dog profile' }, { status: 500 });
  }
}
