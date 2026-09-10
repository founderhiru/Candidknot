// @polsia:user-owned — Phase 4: upload a document (certificate/scan)
// attached to a health record. Ownership enforced by loadOwnedDog() on the
// parent dog; the record row is additionally checked to belong to that dog.
import 'server-only';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { toHealthRecordItem } from '@/lib/contracts/health-records';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';
import { uploadPrivateObject } from '@/lib/storage';
import { UploadValidationError, validateDocumentFile } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string; recordId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id, recordId } = await params;
    await loadOwnedDog(id);

    const record = await prisma.healthRecord.findUnique({ where: { id: recordId } });
    if (!record || record.dogId !== id) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    const extension = validateDocumentFile(file);
    const storageKey = `dogs/${id}/health-records/${recordId}/${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadPrivateObject(storageKey, buffer, file.type);

    await prisma.healthDocument.create({
      data: {
        healthRecordId: recordId,
        storageKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    const updated = await prisma.healthRecord.findUniqueOrThrow({
      where: { id: recordId },
      include: { documents: true },
    });

    return NextResponse.json(toHealthRecordItem(updated), { status: 201 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to upload document' }, { status: 500 });
  }
}
