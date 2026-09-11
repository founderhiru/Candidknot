// @polsia:user-owned — client-safe contract for the Launch MVP Interest
// feature. Keep free of Prisma/server-only imports so the client view and
// its route handler validate the same shapes.
import { z } from 'zod';

export const INTEREST_STATUSES = ['pending', 'accepted', 'declined'] as const;
export type InterestStatus = (typeof INTEREST_STATUSES)[number];

// Write shape: the only thing the authenticated sender may submit.
// Deliberately has NO senderId/ownerId field — identity is always derived
// server-side from the session (requireAuthenticatedUser()), never
// accepted from the client.
export const InterestWrite = z.object({
  targetDogId: z.string().trim().min(1, 'targetDogId is required'),
});
export type InterestWrite = z.infer<typeof InterestWrite>;

// PATCH /api/interests/[id] — only the target dog's owner may submit this
// (see loadOwnedInterestForReceiver in that route). "accepted" creates a
// Match server-side; there is no client-settable "pending" (initial state
// only) or arbitrary status.
export const InterestStatusUpdate = z.object({
  status: z.enum(['accepted', 'declined']),
});
export type InterestStatusUpdate = z.infer<typeof InterestStatusUpdate>;

export const InterestItem = z.object({
  id: z.string(),
  targetDogId: z.string(),
  status: z.enum(INTEREST_STATUSES),
  createdAt: z.string(), // ISO datetime
});
export type InterestItem = z.infer<typeof InterestItem>;

// GET /api/interests/received — one of the current user's dogs received
// this interest. Includes just enough sender/dog display info for the
// Matches tab's "incoming" list, without a second round trip per row.
export const IncomingInterestItem = z.object({
  id: z.string(),
  status: z.enum(INTEREST_STATUSES),
  createdAt: z.string(),
  senderName: z.string().nullable(),
  targetDogId: z.string(),
  targetDogName: z.string(),
});
export type IncomingInterestItem = z.infer<typeof IncomingInterestItem>;
export const IncomingInterestList = z.object({ items: z.array(IncomingInterestItem) });
export type IncomingInterestList = z.infer<typeof IncomingInterestList>;

// GET /api/interests/sent — interests the current user has sent.
export const OutgoingInterestItem = z.object({
  id: z.string(),
  status: z.enum(INTEREST_STATUSES),
  createdAt: z.string(),
  targetDogId: z.string(),
  targetDogName: z.string(),
});
export type OutgoingInterestItem = z.infer<typeof OutgoingInterestItem>;
export const OutgoingInterestList = z.object({ items: z.array(OutgoingInterestItem) });
export type OutgoingInterestList = z.infer<typeof OutgoingInterestList>;

// Shape of a Prisma Interest row — kept structural (no Prisma import) so
// this stays a client-importable module.
type InterestRow = {
  id: string;
  targetDogId: string;
  status: string;
  createdAt: Date;
};

/** Converts a Prisma Interest row into the wire shape. */
export function toInterestItem(row: InterestRow): InterestItem {
  return InterestItem.parse({
    id: row.id,
    targetDogId: row.targetDogId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
}
