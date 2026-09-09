// @polsia:user-owned — client-safe contract for public dog discovery.
// Keep this module free of Prisma and server-only imports so the client island
// and its route handler validate the same response shape.
import { z } from 'zod';

const optionalQueryString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const DogDiscoveryQuery = z.object({
  breed: optionalQueryString,
  city: optionalQueryString,
  radiusKm: z.coerce.number().int().min(5).max(100).default(25),
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
