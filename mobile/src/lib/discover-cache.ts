// Mobile — tiny in-memory handoff from the Discover list to Dog Detail.
//
// There is no public single-dog endpoint (GET /api/dog-profiles/[id] is
// owner-only, see discover-contracts.ts) — the public discovery LIST
// response already contains everything Dog Detail needs per item, so
// rather than inventing a new backend route, the list screen caches what
// it already fetched and Detail reads it back by id. Module-level, not
// persisted — cleared implicitly every time Discover re-fetches.
import type { DogProfileItem } from "./discover-contracts";

let cache = new Map<string, DogProfileItem>();

export function setDiscoverCache(items: DogProfileItem[]): void {
  cache = new Map(items.map((item) => [item.id, item]));
}

export function getCachedDiscoverDog(id: string): DogProfileItem | null {
  return cache.get(id) ?? null;
}
