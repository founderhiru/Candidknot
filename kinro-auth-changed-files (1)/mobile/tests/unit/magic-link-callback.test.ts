import { describe, expect, it, vi } from "vitest";
import { describeMagicLinkCallbackError } from "@/lib/auth-errors";
import {
  type CookieStorage,
  firstParam,
  persistSessionCookie,
} from "@/lib/magic-link-callback";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const calls: string[] = [];
  const storage: CookieStorage = {
    async getItemAsync(key) {
      calls.push(`get:${key}`);
      return data[key] ?? null;
    },
    async setItemAsync(key, value) {
      calls.push(`set:${key}`);
      data[key] = value;
    },
  };
  return { storage, data, calls };
}

describe("persistSessionCookie (magic-link deep link -> session)", () => {
  it("merges the cookie into the stored session, THEN signals the session store", async () => {
    const { storage, data, calls } = fakeStorage({ canidknot_cookie: "{}" });
    const order: string[] = [];
    const notify = vi.fn(() => {
      order.push(`notify(after ${calls.at(-1)})`);
    });
    const mergeCookie = vi.fn(
      (header: string, previous?: string) => `merged(${header}|${previous})`,
    );

    await persistSessionCookie("better-auth.session_token=abc", {
      storage,
      storageKey: "canidknot_cookie",
      mergeCookie,
      notifySessionChanged: notify,
    });

    expect(mergeCookie).toHaveBeenCalledWith(
      "better-auth.session_token=abc",
      "{}",
    );
    expect(data.canidknot_cookie).toBe(
      "merged(better-auth.session_token=abc|{})",
    );
    // The signal must come after the write, or the refetch would read the
    // old (signed-out) cookie — the exact bug this fixes.
    expect(notify).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["notify(after set:canidknot_cookie)"]);
  });

  it("works when nothing is stored yet (fresh install / cold start from the link)", async () => {
    const { storage, data } = fakeStorage();
    const mergeCookie = vi.fn((header: string, previous?: string) =>
      JSON.stringify({ header, previous: previous ?? null }),
    );
    const notify = vi.fn();
    await persistSessionCookie("c=1", {
      storage,
      storageKey: "k",
      mergeCookie,
      notifySessionChanged: notify,
    });
    expect(mergeCookie).toHaveBeenCalledWith("c=1", undefined);
    expect(JSON.parse(data.k ?? "")).toEqual({ header: "c=1", previous: null });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("does NOT signal a session change if the write failed", async () => {
    const storage: CookieStorage = {
      getItemAsync: async () => null,
      setItemAsync: async () => {
        throw new Error("keychain unavailable");
      },
    };
    const notify = vi.fn();
    await expect(
      persistSessionCookie("c=1", {
        storage,
        storageKey: "k",
        mergeCookie: (h) => h,
        notifySessionChanged: notify,
      }),
    ).rejects.toThrow("keychain unavailable");
    expect(notify).not.toHaveBeenCalled();
  });
});

describe("firstParam", () => {
  it("normalises expo-router param shapes", () => {
    expect(firstParam("a")).toBe("a");
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam("")).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });
});

describe("invalid / expired magic link handling", () => {
  it("explains an expired or already-used link (better-auth reports INVALID_TOKEN)", () => {
    const expected =
      "This sign-in link has expired or was already used. Request a new one.";
    expect(describeMagicLinkCallbackError("INVALID_TOKEN")).toBe(expected);
    expect(describeMagicLinkCallbackError("invalid_token")).toBe(expected);
    expect(describeMagicLinkCallbackError("token_expired")).toBe(expected);
  });

  it("falls back to a generic message for any other failure", () => {
    const generic =
      "We couldn't sign you in from that link. Request a new one.";
    expect(describeMagicLinkCallbackError("failed_to_create_session")).toBe(
      generic,
    );
    expect(describeMagicLinkCallbackError(undefined)).toBe(generic);
    expect(describeMagicLinkCallbackError(null)).toBe(generic);
  });
});
