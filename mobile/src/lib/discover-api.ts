// Mobile — typed wrapper around the EXISTING public
// GET /api/dog-profiles endpoint (audited from src/app/api/dog-profiles/
// route.ts). No new backend capability, no auth attached (skipAuth) — this
// is the same endpoint guests and signed-in users both read.
import { apiFetch } from "./api-client";
import {
  type DiscoveryFilterValues,
  DogProfileList,
} from "./discover-contracts";

export async function fetchDiscoverDogs(
  filters: DiscoveryFilterValues = {},
): Promise<DogProfileList> {
  const params = new URLSearchParams();
  if (filters.breed) params.set("breed", filters.breed);
  if (filters.city) params.set("city", filters.city);
  if (filters.radiusKm) params.set("radiusKm", String(filters.radiusKm));
  if (filters.verifiedOnly) params.set("verifiedOnly", "true");

  const query = params.toString();
  return apiFetch(`/api/dog-profiles${query ? `?${query}` : ""}`, {
    skipAuth: true,
    schema: DogProfileList,
  });
}
