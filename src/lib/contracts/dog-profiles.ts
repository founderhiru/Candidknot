// @polsia:user-owned — client-safe contract for public dog discovery.
// Keep this module free of Prisma and server-only imports so the client island
// and its route handler validate the same response shape.
import { z } from 'zod';
import { DogPhotoItem } from '@/lib/contracts/dog-photos';
import { HealthRecordItem } from '@/lib/contracts/health-records';

const optionalQueryString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const DogDiscoveryQuery = z.object({
  breed: optionalQueryString,
  city: optionalQueryString,
  radiusKm: z.coerce.number().int().min(5).max(100).default(25),
  // Phase 5 — filter to verified profiles only. Absent/anything other than
  // "true" or "1" means false; there is no tri-state here.
  verifiedOnly: z.preprocess((value) => value === 'true' || value === '1', z.boolean()),
});

export const DogProfileItem = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  breed: z.string(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  ageYears: z.number().int().nonnegative(),
  sex: z.string(),
  bio: z.string(),
  isVerified: z.boolean(),
  distanceKm: z.number().nonnegative().nullable(),
  // Phase 5 — cover photo (position 0, if any) and whether ANY health
  // records exist. Deliberately no record detail or document access here:
  // this is the public, unauthenticated discovery endpoint. See
  // src/lib/contracts/health-records.ts for the owner-only shape.
  coverPhotoUrl: z.string().nullable(),
  hasHealthRecords: z.boolean(),
});

export const DogProfileList = z.object({
  items: z.array(DogProfileItem),
  total: z.number().int().nonnegative(),
  filters: z.object({
    breeds: z.array(z.string()),
    cities: z.array(z.string()),
    radiusOptions: z.array(z.number().int().min(5).max(100)),
  }),
});

export type DogDiscoveryQuery = z.infer<typeof DogDiscoveryQuery>;
export type DogProfileItem = z.infer<typeof DogProfileItem>;
export type DogProfileList = z.infer<typeof DogProfileList>;

// --- Phase 3: owner-authored dog profiles -----------------------------
//
// Write shape: fields the authenticated owner may submit for create/update.
// Deliberately has NO id/ownerId/slug field — ownership and slug are always
// derived/generated server-side, never accepted from the client.
export const DogProfileWrite = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
  breed: z.string().trim().min(1, 'Breed is required').max(80, 'Breed is too long'),
  city: z.string().trim().min(1, 'City is required').max(120, 'City is too long'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  ageYears: z.coerce.number().int().min(0, 'Age must be 0 or more').max(30, 'Age is too high'),
  sex: z.string().trim().min(1, 'Sex is required').max(20, 'Sex is too long'),
  bio: z.string().trim().min(1, 'Bio is required').max(1000, 'Bio is too long'),
});

// Owner-facing read shape — the public fields (minus distanceKm, which is a
// value the public discovery endpoint computes at request time, not a
// column on the row) plus ownerId, so the client can show "yours" state.
// Never used to derive ownership server-side; that always comes from
// requireResourceOwner() against the DB row.
//
// Phase 4 adds photos + healthRecords — both loaded via the same
// ownership-checked dog row in /api/dog-profiles/[id], never a separate
// unauthenticated path. Deliberately no `.default([])` here: TypeScript
// loses that resolved default (and infers `T | undefined`) when the
// schema flows through apiFetch's generic `ZodType<T>` parameter — every
// server call site below supplies photos/healthRecords explicitly instead.
export const OwnedDogProfileItem = DogProfileItem.omit({
  distanceKm: true,
  coverPhotoUrl: true,
  hasHealthRecords: true,
}).extend({
  ownerId: z.string().nullable(),
  photos: z.array(DogPhotoItem),
  healthRecords: z.array(HealthRecordItem),
});

export const OwnedDogProfileList = z.object({
  items: z.array(OwnedDogProfileItem),
});

export type DogProfileWrite = z.infer<typeof DogProfileWrite>;
export type OwnedDogProfileItem = z.infer<typeof OwnedDogProfileItem>;
export type OwnedDogProfileList = z.infer<typeof OwnedDogProfileList>;
