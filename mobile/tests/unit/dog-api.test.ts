import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

const sampleDog = {
  id: "dog1",
  slug: "bruno-abc123",
  name: "Bruno",
  breed: "Labrador",
  city: "Bengaluru",
  latitude: 12.9716,
  longitude: 77.5946,
  ageYears: 3,
  sex: "Male",
  bio: "Friendly",
  isVerified: false,
  ownerId: "user1",
  photos: [],
  healthRecords: [],
};

describe("createDog / updateDog", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue(sampleDog);
  });

  it("POSTs the write fields only — never an ownerId/userId authority field", async () => {
    const { createDog } = await import("@/lib/dog-api");
    await createDog({
      name: "Bruno",
      breed: "Labrador",
      city: "Bengaluru",
      latitude: 12.9716,
      longitude: 77.5946,
      ageYears: 3,
      sex: "Male",
      bio: "Friendly",
    });
    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/dog-profiles");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body).not.toHaveProperty("ownerId");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("id");
  });

  it("PATCHes an existing dog by its id in the URL, not in the body", async () => {
    const { updateDog } = await import("@/lib/dog-api");
    await updateDog("dog1", {
      name: "Bruno",
      breed: "Labrador",
      city: "Bengaluru",
      latitude: 12.9716,
      longitude: 77.5946,
      ageYears: 4,
      sex: "Male",
      bio: "Friendly",
    });
    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/dog-profiles/dog1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).not.toHaveProperty("id");
  });
});

describe("listMyDogs / getDog", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches the authenticated owner's own dog list (no ownerId param sent)", async () => {
    apiFetchMock.mockResolvedValue({ items: [sampleDog] });
    const { listMyDogs } = await import("@/lib/dog-api");
    await listMyDogs();
    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/dog-profiles/mine");
  });

  it("fetches a single dog by id — ownership is enforced server-side, not by the client", async () => {
    apiFetchMock.mockResolvedValue(sampleDog);
    const { getDog } = await import("@/lib/dog-api");
    await getDog("dog1");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/dog-profiles/dog1",
      expect.anything(),
    );
  });
});

describe("fetchBreedSuggestions", () => {
  it("reads the public discovery endpoint without attaching auth", async () => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({
      filters: {
        breeds: ["Labrador", "Beagle"],
        cities: [],
        radiusOptions: [],
      },
    });
    const { fetchBreedSuggestions } = await import("@/lib/dog-api");
    const breeds = await fetchBreedSuggestions();
    expect(breeds).toEqual(["Labrador", "Beagle"]);
    const [, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { skipAuth?: boolean },
    ];
    expect(options.skipAuth).toBe(true);
  });
});

describe("photo operations", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("uploads a photo as multipart FormData", async () => {
    apiFetchMock.mockResolvedValue({
      id: "p1",
      url: "https://example.com/p1.jpg",
      position: 0,
    });
    const { uploadDogPhoto } = await import("@/lib/dog-api");
    await uploadDogPhoto("dog1", {
      uri: "file:///tmp/x.jpg",
      name: "x.jpg",
      type: "image/jpeg",
    });
    const [path, options] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/dog-profiles/dog1/photos");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("deletes a photo by dog id + photo id", async () => {
    apiFetchMock.mockResolvedValue({ ok: true });
    const { deleteDogPhoto } = await import("@/lib/dog-api");
    await deleteDogPhoto("dog1", "photo1");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/dog-profiles/dog1/photos/photo1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("sets a photo as the cover by PATCHing its position to 0", async () => {
    apiFetchMock.mockResolvedValue({
      id: "photo2",
      url: "https://example.com/p2.jpg",
      position: 0,
    });
    const { setCoverPhoto } = await import("@/lib/dog-api");
    await setCoverPhoto("dog1", "photo2");
    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/dog-profiles/dog1/photos/photo2/position");
    expect(JSON.parse(options.body)).toEqual({ position: 0 });
  });
});
