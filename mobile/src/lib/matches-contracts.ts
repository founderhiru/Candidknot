// Mobile — client-side mirror of the backend's Match contract
// (src/lib/contracts/matches.ts). Not a new API — describes the exact
// shape GET /api/matches already returns.
import { z } from "zod";

export const MatchItem = z.object({
  id: z.string(),
  conversationId: z.string(),
  targetDogId: z.string(),
  targetDogName: z.string(),
  otherUserName: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});
export type MatchItem = z.infer<typeof MatchItem>;

export const MatchList = z.object({ items: z.array(MatchItem) });
export type MatchList = z.infer<typeof MatchList>;
