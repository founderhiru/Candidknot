// @polsia:user-owned — client-safe contract for Launch MVP Phase A
// (Matching). Keep free of Prisma/server-only imports.
import { z } from 'zod';

// GET /api/matches — the current user's matches, whichever side they were
// on (sender or receiver of the original interest). `otherUserName` is
// always the OTHER party, never the caller, so mobile never has to figure
// out which id is "me".
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
