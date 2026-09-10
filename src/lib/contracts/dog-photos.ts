// @polsia:user-owned — client-safe contract for dog photos (Phase 4). Keep
// free of Prisma/server-only imports.
import { z } from 'zod';

export const DogPhotoItem = z.object({
  id: z.string(),
  url: z.string(),
  position: z.number().int().nonnegative(),
});

export const DogPhotoList = z.object({
  items: z.array(DogPhotoItem),
});

// Write shape for reordering/setting the cover photo. 0 is the cover slot
// shown on public Discover cards (Phase 5); MAX_PHOTOS_PER_DOG (6, see
// @/lib/uploads) bounds the valid range.
export const DogPhotoPositionWrite = z.object({
  position: z.coerce.number().int().min(0).max(5),
});

export type DogPhotoItem = z.infer<typeof DogPhotoItem>;
export type DogPhotoList = z.infer<typeof DogPhotoList>;
export type DogPhotoPositionWrite = z.infer<typeof DogPhotoPositionWrite>;
