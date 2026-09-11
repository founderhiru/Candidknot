// Mobile (Launch MVP Phase A) — thin, typed wrapper around the EXISTING
// GET /api/matches endpoint (audited from src/app/api/matches/route.ts).
import { apiFetch } from "./api-client";
import { MatchList } from "./matches-contracts";

export async function listMatches(): Promise<MatchList> {
  return apiFetch("/api/matches", { schema: MatchList });
}
