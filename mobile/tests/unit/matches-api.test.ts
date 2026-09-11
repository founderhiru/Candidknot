import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

const sampleMatch = {
  id: "match_1",
  conversationId: "conv_1",
  targetDogId: "dog_1",
  targetDogName: "Bruno",
  otherUserName: "Priya",
  status: "active",
  createdAt: "2026-09-11T00:00:00.000Z",
};

describe("listMatches", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches the current user's matches with no client-supplied userId filter", async () => {
    apiFetchMock.mockResolvedValue({ items: [sampleMatch] });
    const { listMatches } = await import("@/lib/matches-api");
    const result = await listMatches();

    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/matches");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ otherUserName: "Priya" });
  });
});
