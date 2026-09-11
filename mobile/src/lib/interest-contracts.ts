// Mobile — client-side mirror of the backend's Interest contract
// (src/lib/contracts/interests.ts). Not a new API — describes the exact
// request/response shape the existing /api/interests* routes already use,
// so apiFetch's `schema` option can validate what comes back.
import { z } from "zod";

export const INTEREST_STATUSES = ["pending", "accepted", "declined"] as const;
export type InterestStatus = (typeof INTEREST_STATUSES)[number];

// Deliberately has NO senderId field — identity is always derived
// server-side from the session, never accepted from the client.
export const InterestWrite = z.object({
  targetDogId: z.string().trim().min(1),
});
export type InterestWrite = z.infer<typeof InterestWrite>;

// PATCH /api/interests/[id] — only the target dog's owner may submit this.
export const InterestStatusUpdate = z.object({
  status: z.enum(["accepted", "declined"]),
});
export type InterestStatusUpdate = z.infer<typeof InterestStatusUpdate>;

export const InterestItem = z.object({
  id: z.string(),
  targetDogId: z.string(),
  status: z.enum(INTEREST_STATUSES),
  createdAt: z.string(),
});
export type InterestItem = z.infer<typeof InterestItem>;

export const IncomingInterestItem = z.object({
  id: z.string(),
  status: z.enum(INTEREST_STATUSES),
  createdAt: z.string(),
  senderName: z.string().nullable(),
  targetDogId: z.string(),
  targetDogName: z.string(),
});
export type IncomingInterestItem = z.infer<typeof IncomingInterestItem>;
export const IncomingInterestList = z.object({
  items: z.array(IncomingInterestItem),
});
export type IncomingInterestList = z.infer<typeof IncomingInterestList>;
