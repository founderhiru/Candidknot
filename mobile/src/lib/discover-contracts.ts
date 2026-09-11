// Mobile — mirrors the backend's PUBLIC discovery contract exactly
// (src/lib/contracts/dog-profiles.ts: DogProfileItem/DogProfileList/
// DogDiscoveryQuery). This is deliberately a different, smaller shape than
// OwnedDogProfileItem in contracts.ts — the public endpoint never returns
// the full photo gallery or health record detail, only a cover photo url
// and a hasHealthRecords boolean. There is no public single-dog endpoint
// (GET /api/dog-profiles/[id] is owner-only) — see discover-cache.ts for
// how Dog Detail gets its data without one.
import { z } from "zod";

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
  coverPhotoUrl: z.string().nullable(),
  hasHealthRecords: z.boolean(),
});
export type DogProfileItem = z.infer<typeof DogProfileItem>;

export const DogProfileList = z.object({
  items: z.array(DogProfileItem),
  total: z.number().int().nonnegative(),
  filters: z.object({
    breeds: z.array(z.string()),
    cities: z.array(z.string()),
    radiusOptions: z.array(z.number().int().min(5).max(100)),
  }),
});
export type DogProfileList = z.infer<typeof DogProfileList>;

export interface DiscoveryFilterValues {
  breed?: string;
  city?: string;
  radiusKm?: number;
  verifiedOnly?: boolean;
}
