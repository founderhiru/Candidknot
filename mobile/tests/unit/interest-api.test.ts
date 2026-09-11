import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

describe("expressInterest", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("POSTs only the target dog id — never a senderId/ownerId/userId authority field", async () => {
    apiFetchMock.mockResolvedValue({
      id: "interest_1",
      targetDogId: "dog_1",
      status: "pending",
      createdAt: "2026-09-11T00:00:00.000Z",
    });
    const { expressInterest } = await import("@/lib/interest-api");
    await expressInterest("dog_1");

    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/interests");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body).toEqual({ targetDogId: "dog_1" });
    expect(body).not.toHaveProperty("senderId");
    expect(body).not.toHaveProperty("ownerId");
    expect(body).not.toHaveProperty("userId");
  });

  it("propagates the backend's error (e.g. duplicate/self-interest) rather than swallowing it", async () => {
    class FakeApiError extends Error {
      readonly status: number;
      constructor(status: number, body: unknown) {
        super(`apiFetch /api/interests failed (${status})`);
        this.status = status;
        this.name = "ApiError";
        // biome-ignore lint/suspicious/noExplicitAny: test-only stand-in for the real ApiError's body field.
        (this as any).body = body;
      }
    }
    apiFetchMock.mockRejectedValue(
      new FakeApiError(409, {
        error: "You've already expressed interest in this dog",
      }),
    );
    const { expressInterest } = await import("@/lib/interest-api");

    await expect(expressInterest("dog_1")).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("listIncomingInterests", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches incoming interests with no client-supplied ownerId filter", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    const { listIncomingInterests } = await import("@/lib/interest-api");
    await listIncomingInterests();

    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/interests/received");
  });
});

describe("respondToInterest", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("PATCHes only the status — never a client-supplied ownerId/receiverId", async () => {
    apiFetchMock.mockResolvedValue({
      id: "interest_1",
      targetDogId: "dog_1",
      status: "accepted",
      createdAt: "2026-09-11T00:00:00.000Z",
    });
    const { respondToInterest } = await import("@/lib/interest-api");
    await respondToInterest("interest_1", "accepted");

    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/interests/interest_1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ status: "accepted" });
  });
});
