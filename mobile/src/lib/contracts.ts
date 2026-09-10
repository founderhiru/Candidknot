// Mobile (Phase mobile-M2) — client-side mirrors of the backend's own
// contracts (src/lib/contracts/owner-profile.ts, dog-profiles.ts,
// dog-photos.ts at the repo root). These are NOT a new API — they describe
// the exact response/request shapes the existing endpoints already use, so
// apiFetch's `schema` option can validate what comes back. Keep in sync
// with the backend contracts if those ever change.
import { z } from "zod";

// --- Owner profile (GET/POST/PATCH /api/owner-profile) ---------------------

export const OwnerProfileWrite = z.object({
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(120, "City is too long"),
  bio: z.string().trim().min(1, "Bio is required").max(1000, "Bio is too long"),
});
export type OwnerProfileWrite = z.infer<typeof OwnerProfileWrite>;

export const OwnerProfileItem = OwnerProfileWrite.extend({
  id: z.string(),
  userId: z.string(),
});
export type OwnerProfileItem = z.infer<typeof OwnerProfileItem>;

// --- Dog profiles (POST /api/dog-profiles, GET .../mine, GET/PATCH .../[id]) -

export const DogProfileWrite = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name is too long"),
  breed: z
    .string()
    .trim()
    .min(1, "Breed is required")
    .max(80, "Breed is too long"),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(120, "City is too long"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  ageYears: z
    .number()
    .int()
    .min(0, "Age must be 0 or more")
    .max(30, "Age is too high"),
  sex: z.string().trim().min(1, "Sex is required").max(20, "Sex is too long"),
  bio: z.string().trim().min(1, "Bio is required").max(1000, "Bio is too long"),
});
export type DogProfileWrite = z.infer<typeof DogProfileWrite>;

export const DogPhotoItem = z.object({
  id: z.string(),
  url: z.string(),
  position: z.number().int().nonnegative(),
});
export type DogPhotoItem = z.infer<typeof DogPhotoItem>;

// The backend's HealthRecordItem shape isn't needed on mobile in M2 (Health
// Passport is a later phase) — kept as an untyped passthrough so parsing
// the dog response doesn't require mirroring a contract this phase doesn't
// use.
export const OwnedDogProfileItem = DogProfileWrite.extend({
  id: z.string(),
  slug: z.string(),
  isVerified: z.boolean(),
  ownerId: z.string().nullable(),
  photos: z.array(DogPhotoItem),
  healthRecords: z.array(z.unknown()),
});
export type OwnedDogProfileItem = z.infer<typeof OwnedDogProfileItem>;

export const OwnedDogProfileList = z.object({
  items: z.array(OwnedDogProfileItem),
});
export type OwnedDogProfileList = z.infer<typeof OwnedDogProfileList>;

// GET /api/dog-profiles (public discovery) — mobile only reads
// `filters.breeds` from this for the breed-suggestion list; the rest of the
// discovery response is out of scope until the Discover phase.
export const DiscoveryFilters = z.object({
  filters: z.object({
    breeds: z.array(z.string()),
    cities: z.array(z.string()),
    radiusOptions: z.array(z.number()),
  }),
});
export type DiscoveryFilters = z.infer<typeof DiscoveryFilters>;

// DELETE /api/dog-profiles/[id]/photos/[photoId]
export const OkResponse = z.object({ ok: z.boolean() });
export type OkResponse = z.infer<typeof OkResponse>;
