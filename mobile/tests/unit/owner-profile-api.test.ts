import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

// A plain object with a `status` field is all getOwnerProfile()'s 404 check
// looks at — avoids importing the real ApiError class from the mocked
// module, which trips up vi.mock's hoisting.
function apiErrorLike(status: number) {
  const err = new Error("api error") as Error & {
    status: number;
    body: unknown;
  };
  err.status = status;
  err.body = { error: "api error" };
  return err;
}

describe("getOwnerProfile", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("returns the profile on success", async () => {
    const profile = { id: "op1", userId: "u1", city: "Pune", bio: "Hello" };
    apiFetchMock.mockResolvedValue(profile);

    const { getOwnerProfile } = await import("@/lib/owner-profile-api");
    await expect(getOwnerProfile()).resolves.toEqual(profile);
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/owner-profile",
      expect.objectContaining({}),
    );
  });

  it("returns null (not an error) when the backend responds 404 — no profile yet", async () => {
    apiFetchMock.mockRejectedValue(apiErrorLike(404));

    const { getOwnerProfile } = await import("@/lib/owner-profile-api");
    await expect(getOwnerProfile()).resolves.toBeNull();
  });

  it("re-throws any other error", async () => {
    apiFetchMock.mockRejectedValue(apiErrorLike(500));

    const { getOwnerProfile } = await import("@/lib/owner-profile-api");
    await expect(getOwnerProfile()).rejects.toThrow();
  });
});

describe("createOwnerProfile / updateOwnerProfile", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({
      id: "op1",
      userId: "u1",
      city: "Pune",
      bio: "Hello",
    });
  });

  it("POSTs to create", async () => {
    const { createOwnerProfile } = await import("@/lib/owner-profile-api");
    await createOwnerProfile({ city: "Pune", bio: "Hello" });
    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/owner-profile");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ city: "Pune", bio: "Hello" });
  });

  it("PATCHes to update", async () => {
    const { updateOwnerProfile } = await import("@/lib/owner-profile-api");
    await updateOwnerProfile({ city: "Pune", bio: "Updated" });
    const [, options] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("PATCH");
  });
});
