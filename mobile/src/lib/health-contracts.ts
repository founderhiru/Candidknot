// Mobile — client-side mirror of the backend's health passport contract
// (src/lib/contracts/health-records.ts). Not a new API — describes the
// exact shapes the existing /api/dog-profiles/[id]/health-records* routes
// already use, so apiFetch's `schema` option can validate what comes back.
// Keep in sync with the backend contract if it ever changes.
import { z } from "zod";

export const HEALTH_RECORD_TYPES = [
  "vaccination",
  "vetVisit",
  "other",
] as const;
export type HealthRecordType = (typeof HEALTH_RECORD_TYPES)[number];

const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;

// Write shape: fields the authenticated owner may submit for create/update.
// occurredOn is a plain YYYY-MM-DD string, matching the backend's
// HealthRecordWrite contract exactly.
export const HealthRecordWrite = z.object({
  type: z.enum(HEALTH_RECORD_TYPES),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title is too long"),
  occurredOn: z.string().regex(isoDateOnly, "Use YYYY-MM-DD"),
  vetName: z
    .string()
    .trim()
    .max(120, "Vet name is too long")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes are too long")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
});
export type HealthRecordWrite = z.infer<typeof HealthRecordWrite>;

// A document's id/fileName/mimeType/sizeBytes are safe to list — the bytes
// themselves are private and reachable ONLY via the ownership-checked
// .../documents/[documentId]/download route, which returns
// DocumentDownloadUrl below. No permanent url is ever included here.
export const HealthDocumentItem = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type HealthDocumentItem = z.infer<typeof HealthDocumentItem>;

// Response of the download route: a short-lived signed URL, generated
// fresh on every request and never persisted on-device.
export const DocumentDownloadUrl = z.object({
  url: z.string(),
  expiresInSeconds: z.number().int().positive(),
});
export type DocumentDownloadUrl = z.infer<typeof DocumentDownloadUrl>;

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
export type HealthRecordItem = z.infer<typeof HealthRecordItem>;

export const HealthRecordList = z.object({
  items: z.array(HealthRecordItem),
});
export type HealthRecordList = z.infer<typeof HealthRecordList>;
