// @polsia:user-owned — Phase 4: upload a photo for a dog the caller owns.
// Ownership is enforced by loadOwnedDog() (404, never 401/403, if the dog
// doesn't exist or belongs to someone else — see @/lib/dog-ownership).
import 'server-only';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';
import { uploadPublicObject } from '@/lib/storage';
import { MAX_PHOTOS_PER_DOG, UploadValidationError, validatePhotoFile } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await loadOwnedDog(id);

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    const existingCount = await prisma.dogPhoto.count({ where: { dogId: id } });
    if (existingCount >= MAX_PHOTOS_PER_DOG) {
      return NextResponse.json(
        { error: `A dog can have at most ${MAX_PHOTOS_PER_DOG} photos.` },
        { status: 400 },
      );
    }

    const extension = validatePhotoFile(file);
    const storageKey = `dogs/${id}/photos/${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadPublicObject(storageKey, buffer, file.type);

    const photo = await prisma.dogPhoto.create({
      data: { dogId: id, storageKey, url, position: existingCount },
    });

    return NextResponse.json(
      { id: photo.id, url: photo.url, position: photo.position },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to upload photo' }, { status: 500 });
  }
}
