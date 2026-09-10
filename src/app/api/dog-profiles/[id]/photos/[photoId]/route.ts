// @polsia:user-owned — Phase 4: delete a photo belonging to a dog the
// caller owns. Ownership is enforced by loadOwnedDog() on the parent dog
// (404, never 401/403 — see @/lib/dog-ownership); the photo row is then
// additionally checked to belong to that specific dog, so a photoId from a
// different dog (even one the caller also owns) can't be deleted through
// this URL.
import 'server-only';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';
import { deleteObject } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, photoId } = await params;
    await loadOwnedDog(id);

    const photo = await prisma.dogPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.dogId !== id) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    await deleteObject(photo.storageKey);
    await prisma.dogPhoto.delete({ where: { id: photoId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to delete photo' }, { status: 500 });
  }
}
