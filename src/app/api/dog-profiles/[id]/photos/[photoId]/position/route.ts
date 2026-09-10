// @polsia:user-owned — Phase 4: set a photo's gallery position (position 0
// = cover photo). Ownership enforced by loadOwnedDog() on the parent dog;
// the photo row is additionally checked to belong to that dog.
import 'server-only';

import { NextResponse } from 'next/server';
import { DogPhotoPositionWrite } from '@/lib/contracts/dog-photos';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string; photoId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, photoId } = await params;
    await loadOwnedDog(id);

    const photo = await prisma.dogPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.dogId !== id) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const parsed = DogPhotoPositionWrite.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          errors: {
            position: parsed.error.flatten().fieldErrors.position?.[0] ?? 'Invalid position',
          },
        },
        { status: 400 },
      );
    }

    const updated = await prisma.dogPhoto.update({
      where: { id: photoId },
      data: { position: parsed.data.position },
    });

    return NextResponse.json(
      { id: updated.id, url: updated.url, position: updated.position },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to update photo position' }, { status: 500 });
  }
}
