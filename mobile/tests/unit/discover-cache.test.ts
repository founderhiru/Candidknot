import { describe, expect, it } from "vitest";
import { getCachedDiscoverDog, setDiscoverCache } from "@/lib/discover-cache";
import type { DogProfileItem } from "@/lib/discover-contracts";

const sampleDog: DogProfileItem = {
  id: "dog1",
  slug: "bruno-abc",
  name: "Bruno",
  breed: "Labrador",
  city: "Pune",
  latitude: 18.5204,
  longitude: 73.8567,
  ageYears: 3,
  sex: "Male",
  bio: "Friendly",
  isVerified: true,
  distanceKm: null,
  coverPhotoUrl: "https://example.com/bruno.jpg",
  hasHealthRecords: true,
};

describe("discover-cache", () => {
  it("returns a cached dog by id after setDiscoverCache", () => {
    setDiscoverCache([sampleDog]);
    expect(getCachedDiscoverDog("dog1")).toEqual(sampleDog);
  });

  it("returns null for an id not in the cache", () => {
    setDiscoverCache([sampleDog]);
    expect(getCachedDiscoverDog("nonexistent")).toBeNull();
  });

  it("replaces the entire cache on each call rather than merging", () => {
    setDiscoverCache([sampleDog]);
    setDiscoverCache([]);
    expect(getCachedDiscoverDog("dog1")).toBeNull();
  });
});
