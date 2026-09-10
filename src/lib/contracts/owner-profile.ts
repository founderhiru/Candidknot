// @polsia:user-owned — client-safe contract for the owner's own profile.
// Keep this module free of Prisma and server-only imports so the client
// view and its route handler validate the same shapes.
import { z } from 'zod';

// Write shape: fields the authenticated owner may submit for create/update.
// Deliberately has NO id/userId field — identity is always derived
// server-side from the session, never accepted from the client.
export const OwnerProfileWrite = z.object({
  city: z.string().trim().min(1, 'City is required').max(120, 'City is too long'),
  bio: z.string().trim().min(1, 'Bio is required').max(1000, 'Bio is too long'),
});

// Read shape: persisted record returned by the server.
export const OwnerProfileItem = OwnerProfileWrite.extend({
  id: z.string(),
  userId: z.string(),
});

export type OwnerProfileWrite = z.infer<typeof OwnerProfileWrite>;
export type OwnerProfileItem = z.infer<typeof OwnerProfileItem>;
