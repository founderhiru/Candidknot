// @/lib/auth-client pulls in expo-secure-store and @better-auth/expo/client,
// which assume a real Expo/React Native runtime — mocked here the same way
// the web repo mocks better-auth's own internals in its auth tests, so this
// suite only exercises api-client.ts's own request/error-handling logic.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getStoredSessionCookieMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  getStoredSessionCookie: getStoredSessionCookieMock,
}));
vi.mock("@/lib/env", () => ({
  env: { apiUrl: "https://api.test", appScheme: "canidknot" },
}));

describe("apiFetch", () => {
  beforeEach(() => {
    getStoredSessionCookieMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("attaches the stored session cookie by default", async () => {
    getStoredSessionCookieMock.mockResolvedValue(
      "better-auth.session_token=abc123",
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const { apiFetch } = await import("@/lib/api-client");
    await apiFetch("/api/ping");

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("cookie")).toBe("better-auth.session_token=abc123");
  });

  it("skips attaching a cookie when skipAuth is set", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const { apiFetch } = await import("@/lib/api-client");
    await apiFetch("/api/public", { skipAuth: true });

    expect(getStoredSessionCookieMock).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedError on a 401 response", async () => {
    getStoredSessionCookieMock.mockResolvedValue("");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "no session" }), { status: 401 }),
    );

    const { apiFetch, UnauthorizedError } = await import("@/lib/api-client");
    await expect(apiFetch("/api/secret")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("throws ApiError on other non-OK responses", async () => {
    getStoredSessionCookieMock.mockResolvedValue("");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "boom" }), { status: 500 }),
    );

    const { apiFetch, ApiError } = await import("@/lib/api-client");
    await expect(apiFetch("/api/broken")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws NetworkError when fetch itself rejects", async () => {
    getStoredSessionCookieMock.mockResolvedValue("");
    vi.mocked(fetch).mockRejectedValue(new TypeError("Network request failed"));

    const { apiFetch, NetworkError } = await import("@/lib/api-client");
    await expect(apiFetch("/api/offline")).rejects.toBeInstanceOf(NetworkError);
  });

  it("parses+validates the response through a provided zod schema", async () => {
    getStoredSessionCookieMock.mockResolvedValue("");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ count: 3 }), { status: 200 }),
    );

    const { z } = await import("zod");
    const { apiFetch } = await import("@/lib/api-client");
    const result = await apiFetch("/api/count", {
      schema: z.object({ count: z.number() }),
    });
    expect(result.count).toBe(3);
  });

  it("does not force a JSON content-type when the body is FormData (multipart uploads)", async () => {
    getStoredSessionCookieMock.mockResolvedValue("");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const { apiFetch } = await import("@/lib/api-client");
    const formData = new FormData();
    formData.append("file", "not-a-real-file");
    await apiFetch("/api/upload", { method: "POST", body: formData });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("content-type")).toBeNull();
  });
});
