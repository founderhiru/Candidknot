// @polsia:user-owned — Phase 4: list/create health records for a dog the
// caller owns. Ownership enforced by loadOwnedDog() (404, never 401/403 —
// see @/lib/dog-ownership). Never exposed on any public/unauthenticated
// route.
import 'server-only';

import { NextResponse } from 'next/server';
import {
  HealthRecordList,
  HealthRecordWrite,
  toHealthRecordItem,
} from '@/lib/contracts/health-records';
import { prisma } from '@/lib/db';
import { loadOwnedDog, NotFoundError } from '@/lib/dog-ownership';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await loadOwnedDog(id);

    const records = await prisma.healthRecord.findMany({
      where: { dogId: id },
      include: { documents: true },
      orderBy: { occurredOn: 'desc' },
    });

    return NextResponse.json(HealthRecordList.parse({ items: records.map(toHealthRecordItem) }), {
      status: 200,
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to load health records' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await loadOwnedDog(id);

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

    const created = await prisma.healthRecord.create({
      data: {
        dogId: id,
        type: parsed.data.type,
        title: parsed.data.title,
        occurredOn: new Date(parsed.data.occurredOn),
        vetName: parsed.data.vetName ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: { documents: true },
    });

    return NextResponse.json(toHealthRecordItem(created), { status: 201 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to create health record' }, { status: 500 });
  }
}
