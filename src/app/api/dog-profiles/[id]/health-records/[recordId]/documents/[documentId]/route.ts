// @polsia:user-owned — Phase 4: delete a single document attached to a
// health record. Ownership enforced by loadOwnedDog() on the parent dog;
// the record and document rows are additionally checked to belong to that
// dog/record chain.
import 'server-only';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';
import { deletePrivateObject } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string; recordId: string; documentId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, recordId, documentId } = await params;
    await loadOwnedDog(id);

    const record = await prisma.healthRecord.findUnique({ where: { id: recordId } });
    if (!record || record.dogId !== id) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }

    const document = await prisma.healthDocument.findUnique({ where: { id: documentId } });
    if (!document || document.healthRecordId !== recordId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await deletePrivateObject(document.storageKey);
    await prisma.healthDocument.delete({ where: { id: documentId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to delete document' }, { status: 500 });
  }
}
