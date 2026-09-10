// @polsia:user-owned — client-safe contract for the health passport
// (Phase 4). Keep free of Prisma/server-only imports so the client view
// and its route handlers validate the same shapes.
import { z } from 'zod';

export const HEALTH_RECORD_TYPES = ['vaccination', 'vetVisit', 'other'] as const;

const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;

// Write shape: fields the authenticated owner may submit for create/update.
// occurredOn is a plain YYYY-MM-DD string (matches <input type="date">) —
// route handlers convert it to a Date when writing to Prisma.
export const HealthRecordWrite = z.object({
  type: z.enum(HEALTH_RECORD_TYPES),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title is too long'),
  occurredOn: z.string().regex(isoDateOnly, 'Use YYYY-MM-DD'),
  vetName: z
    .string()
    .trim()
    .max(120, 'Vet name is too long')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes are too long')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
});

// A document's id/fileName/mimeType/sizeBytes are safe to list — the
// bytes themselves are private and reachable ONLY via the ownership-
// checked .../documents/[documentId]/download route, which returns
// DocumentDownloadUrl below. No permanent url is ever included here.
export const HealthDocumentItem = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});

// Response of the download route: a short-lived signed URL, generated
// fresh on every request and never persisted.
export const DocumentDownloadUrl = z.object({
  url: z.string(),
  expiresInSeconds: z.number().int().positive(),
});

export const HealthRecordItem = z.object({
  id: z.string(),
  dogId: z.string(),
  type: z.enum(HEALTH_RECORD_TYPES),
  title: z.string(),
  occurredOn: z.string(), // ISO date (YYYY-MM-DD)
  vetName: z.string().nullable(),
  notes: z.string().nullable(),
  documents: z.array(HealthDocumentItem),
});

export const HealthRecordList = z.object({
  items: z.array(HealthRecordItem),
});

export type HealthRecordType = (typeof HEALTH_RECORD_TYPES)[number];
export type HealthRecordWrite = z.infer<typeof HealthRecordWrite>;
export type HealthDocumentItem = z.infer<typeof HealthDocumentItem>;
export type DocumentDownloadUrl = z.infer<typeof DocumentDownloadUrl>;
export type HealthRecordItem = z.infer<typeof HealthRecordItem>;
export type HealthRecordList = z.infer<typeof HealthRecordList>;

// Shape of a Prisma HealthRecord row with its documents included — kept
// structural (no Prisma import) so this stays a client-importable module.
type HealthRecordRow = {
  id: string;
  dogId: string;
  type: string;
  title: string;
  occurredOn: Date;
  vetName: string | null;
  notes: string | null;
  documents: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }[];
};

/** Converts a Prisma HealthRecord row (with documents) into the wire shape. */
export function toHealthRecordItem(record: HealthRecordRow): HealthRecordItem {
  return HealthRecordItem.parse({
    id: record.id,
    dogId: record.dogId,
    type: record.type,
    title: record.title,
    occurredOn: record.occurredOn.toISOString().slice(0, 10),
    vetName: record.vetName,
    notes: record.notes,
    documents: record.documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
    })),
  });
}
