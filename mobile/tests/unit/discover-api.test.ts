import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

const sampleList = {
  items: [],
  total: 0,
  filters: { breeds: [], cities: [], radiusOptions: [5, 10, 25, 50, 75, 100] },
};

describe("fetchDiscoverDogs", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue(sampleList);
  });

  it("calls the public endpoint with skipAuth and no query params by default", async () => {
    const { fetchDiscoverDogs } = await import("@/lib/discover-api");
    await fetchDiscoverDogs();
    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { skipAuth?: boolean },
    ];
    expect(path).toBe("/api/dog-profiles");
    expect(options.skipAuth).toBe(true);
  });

  it("serializes breed/city/radiusKm/verifiedOnly filters as query params", async () => {
    const { fetchDiscoverDogs } = await import("@/lib/discover-api");
    await fetchDiscoverDogs({
      breed: "Labrador",
      city: "Pune",
      radiusKm: 50,
      verifiedOnly: true,
    });
    const [path] = apiFetchMock.mock.calls[0] as [string];
    expect(path).toContain("breed=Labrador");
    expect(path).toContain("city=Pune");
    expect(path).toContain("radiusKm=50");
    expect(path).toContain("verifiedOnly=true");
  });

  it("omits a filter entirely when not provided, rather than sending an empty value", async () => {
    const { fetchDiscoverDogs } = await import("@/lib/discover-api");
    await fetchDiscoverDogs({ city: "Mumbai" });
    const [path] = apiFetchMock.mock.calls[0] as [string];
    expect(path).not.toContain("breed=");
    expect(path).not.toContain("verifiedOnly=");
  });
});
