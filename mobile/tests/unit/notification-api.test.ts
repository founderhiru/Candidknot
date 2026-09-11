import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

describe("listNotifications", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches the current user's notifications with no client-supplied filter", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    const { listNotifications } = await import("@/lib/notification-api");
    await listNotifications();

    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/notifications");
  });

  it("returns the items as provided by the backend", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: "evt_1",
          type: "match_created",
          message: "You've got a new match!",
          payload: { interestId: "i1" },
          read: false,
          createdAt: "2026-09-11T00:00:00.000Z",
        },
      ],
    });
    const { listNotifications } = await import("@/lib/notification-api");
    const result = await listNotifications();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ type: "match_created" });
  });
});
