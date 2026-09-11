// Mobile (Launch MVP) — thin, typed wrappers around the EXISTING
// /api/interests* endpoints (audited from src/app/api/interests/**).
// No business logic here — ownership/duplicate/self-interest/eligibility
// checks are all server-side; this only sends requests and surfaces
// whatever the backend returns (including its 4xx error responses) via
// ApiError.
import { apiFetch } from "./api-client";
import {
  IncomingInterestList,
  InterestItem,
  type InterestStatusUpdate,
  type InterestWrite,
} from "./interest-contracts";

export async function expressInterest(
  targetDogId: string,
): Promise<InterestItem> {
  const payload: InterestWrite = { targetDogId };
  return apiFetch("/api/interests", {
    method: "POST",
    body: JSON.stringify(payload),
    schema: InterestItem,
  });
}

export async function listIncomingInterests(): Promise<IncomingInterestList> {
  return apiFetch("/api/interests/received", { schema: IncomingInterestList });
}

export async function respondToInterest(
  interestId: string,
  status: InterestStatusUpdate["status"],
): Promise<InterestItem> {
  const payload: InterestStatusUpdate = { status };
  return apiFetch(`/api/interests/${interestId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    schema: InterestItem,
  });
}
