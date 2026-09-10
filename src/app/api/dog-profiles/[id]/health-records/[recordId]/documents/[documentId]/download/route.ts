// @polsia:user-owned — Phase 4: the ONLY way to read a health document's
// bytes. Ownership enforced by loadOwnedDog() on the parent dog; the
// record and document rows are additionally checked to belong to that
// dog/record chain. Only after all three checks pass does this generate a
// short-lived signed URL (via @/lib/storage) — nothing is ever returned
// or logged from an unauthenticated or cross-owner request, and the URL
// itself is never persisted anywhere.
import 'server-only';

import { NextResponse } from 'next/server';
import { DocumentDownloadUrl } from '@/lib/contracts/health-records';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';
import { DOCUMENT_DOWNLOAD_TTL_SECONDS, getSignedDownloadUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string; recordId: string; documentId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
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

    const url = await getSignedDownloadUrl(document.storageKey);

    return NextResponse.json(
      DocumentDownloadUrl.parse({ url, expiresInSeconds: DOCUMENT_DOWNLOAD_TTL_SECONDS }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to generate download link' }, { status: 500 });
  }
}
