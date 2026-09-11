import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

describe("listConversations", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches the current user's conversations with no client-supplied filter", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    const { listConversations } = await import("@/lib/conversation-api");
    await listConversations();

    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/conversations");
  });
});

describe("getConversation", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches a single conversation by id", async () => {
    apiFetchMock.mockResolvedValue({
      id: "conv_1",
      matchId: "match_1",
      targetDogId: "dog_1",
      targetDogName: "Bruno",
      otherUserName: "Priya",
      messages: [],
    });
    const { getConversation } = await import("@/lib/conversation-api");
    await getConversation("conv_1");

    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/conversations/conv_1");
  });
});

describe("sendMessage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("POSTs only the body — never a senderId/userId/conversationId authority field in the body", async () => {
    apiFetchMock.mockResolvedValue({
      id: "msg_1",
      body: "Hello!",
      senderId: "user_a",
      isMine: true,
      createdAt: "2026-09-11T00:00:00.000Z",
    });
    const { sendMessage } = await import("@/lib/conversation-api");
    await sendMessage("conv_1", "Hello!");

    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/conversations/conv_1/messages");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body).toEqual({ body: "Hello!" });
    expect(body).not.toHaveProperty("senderId");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("conversationId");
  });

  it("propagates the backend's error (e.g. unmatched/404) rather than swallowing it", async () => {
    class FakeApiError extends Error {
      readonly status: number;
      constructor(status: number) {
        super(`apiFetch failed (${status})`);
        this.status = status;
        this.name = "ApiError";
      }
    }
    apiFetchMock.mockRejectedValue(new FakeApiError(404));
    const { sendMessage } = await import("@/lib/conversation-api");

    await expect(sendMessage("conv_1", "Hello!")).rejects.toMatchObject({
      status: 404,
    });
  });
});
