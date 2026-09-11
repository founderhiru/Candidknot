import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

describe("checkEntitlement", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("builds the query string with service and scopeId", async () => {
    apiFetchMock.mockResolvedValue({ active: false, freeMessagesRemaining: 2 });
    const { checkEntitlement } = await import("@/lib/entitlement-api");
    await checkEntitlement("connection_messaging", "conv_1");

    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe(
      "/api/entitlements/check?service=connection_messaging&scopeId=conv_1",
    );
  });

  it("omits scopeId from the query string when not provided", async () => {
    apiFetchMock.mockResolvedValue({
      active: false,
      freeMessagesRemaining: null,
    });
    const { checkEntitlement } = await import("@/lib/entitlement-api");
    await checkEntitlement("connection_messaging");

    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/entitlements/check?service=connection_messaging");
  });
});

describe("purchaseEntitlement", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("POSTs the service and scopeId, never a client-supplied userId", async () => {
    apiFetchMock.mockRejectedValue(new Error("501"));
    const { purchaseEntitlement } = await import("@/lib/entitlement-api");

    await expect(
      purchaseEntitlement("connection_messaging", "conv_1"),
    ).rejects.toThrow();

    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/entitlements/purchase");
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      service: "connection_messaging",
      scopeId: "conv_1",
    });
    expect(body).not.toHaveProperty("userId");
  });

  it("propagates the backend's not-configured error rather than resolving with a fake success", async () => {
    class FakeApiError extends Error {
      readonly status: number;
      constructor(status: number) {
        super(`failed (${status})`);
        this.status = status;
      }
    }
    apiFetchMock.mockRejectedValue(new FakeApiError(501));
    const { purchaseEntitlement } = await import("@/lib/entitlement-api");

    await expect(
      purchaseEntitlement("connection_messaging"),
    ).rejects.toMatchObject({
      status: 501,
    });
  });
});
