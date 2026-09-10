// @polsia:user-owned — Phase 4: edit/delete a single health record.
// Ownership enforced by loadOwnedDog() on the parent dog; the record row
// is additionally checked to belong to that dog, so a recordId from a
// different dog (even one the caller also owns) can't be reached through
// this URL. Deleting a record cascades to its documents at the DB level
// (see prisma/schema/health-record.prisma) but NOT to their storage
// objects — see the documents route for that cleanup.
import 'server-only';

import { NextResponse } from 'next/server';
import { HealthRecordWrite, toHealthRecordItem } from '@/lib/contracts/health-records';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';
import { deletePrivateObject } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string; recordId: string }> };

async function loadOwnedRecord(dogId: string, recordId: string) {
  await loadOwnedDog(dogId);
  const record = await prisma.healthRecord.findUnique({
    where: { id: recordId },
    include: { documents: true },
  });
  if (!record || record.dogId !== dogId) {
    return null;
  }
  return record;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, recordId } = await params;
    const record = await loadOwnedRecord(id, recordId);
    if (!record) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }

    const parsed = HealthRecordWrite.safeParse(await request.json());
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

    const updated = await prisma.healthRecord.update({
      where: { id: recordId },
      data: {
        type: parsed.data.type,
        title: parsed.data.title,
        occurredOn: new Date(parsed.data.occurredOn),
        vetName: parsed.data.vetName ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: { documents: true },
    });

    return NextResponse.json(toHealthRecordItem(updated), { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to update health record' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, recordId } = await params;
    const record = await loadOwnedRecord(id, recordId);
    if (!record) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }

    // Clean up storage objects for every attached document before the DB
    // cascade-deletes their rows.
    await Promise.all(record.documents.map((doc) => deletePrivateObject(doc.storageKey)));
    await prisma.healthRecord.delete({ where: { id: recordId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to delete health record' }, { status: 500 });
  }
}
