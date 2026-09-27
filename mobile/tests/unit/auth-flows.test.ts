import { describe, expect, it, vi } from "vitest";
import {
  type AuthFlowClient,
  formatCooldown,
  MAGIC_LINK_CALLBACK_URL,
  MAGIC_LINK_ERROR_CALLBACK_URL,
  RESEND_COOLDOWN_SECONDS,
  requestMagicLink,
  requestOtp,
  verifyOtp,
} from "@/lib/auth-flows";

function makeClient(overrides?: {
  sendOtp?: AuthFlowClient["phoneNumber"]["sendOtp"];
  verify?: AuthFlowClient["phoneNumber"]["verify"];
  magicLink?: AuthFlowClient["signIn"]["magicLink"];
}) {
  const client: AuthFlowClient = {
    phoneNumber: {
      sendOtp: overrides?.sendOtp ?? vi.fn(async () => ({ error: null })),
      verify: overrides?.verify ?? vi.fn(async () => ({ error: null })),
    },
    signIn: {
      magicLink: overrides?.magicLink ?? vi.fn(async () => ({ error: null })),
    },
  };
  return client;
}

describe("OTP request", () => {
  it("sends the number as +91-prefixed E.164", async () => {
    const client = makeClient();
    const result = await requestOtp(client, "9876543210");
    expect(result).toEqual({ ok: true });
    expect(client.phoneNumber.sendOtp).toHaveBeenCalledWith({
      phoneNumber: "+919876543210",
    });
  });

  it("returns a friendly message when the server rejects the number", async () => {
    const client = makeClient({
      sendOtp: async () => ({
        error: { code: "INVALID_PHONE_NUMBER", status: 400 },
      }),
    });
    const result = await requestOtp(client, "9876543210");
    expect(result).toMatchObject({
      ok: false,
      message: "Enter a valid 10-digit Indian mobile number.",
    });
  });

  it("explains rate limiting (HTTP 429)", async () => {
    const client = makeClient({
      sendOtp: async () => ({ error: { status: 429 } }),
    });
    const result = await requestOtp(client, "9876543210");
    expect(result).toMatchObject({ ok: false });
    expect((result as { message: string }).message).toMatch(/wait a minute/i);
  });

  it("reports a server failure (e.g. SMS provider not configured) without leaking details", async () => {
    const client = makeClient({
      sendOtp: async () => ({
        error: { status: 500, message: "MSG91 rejected the OTP request" },
      }),
    });
    const result = await requestOtp(client, "9876543210");
    expect(result).toEqual({
      ok: false,
      message: "We couldn't send the code right now. Please try again.",
      code: undefined,
    });
  });

  it("reports being offline when fetch itself rejects", async () => {
    const client = makeClient({
      sendOtp: async () => {
        throw new TypeError("Network request failed");
      },
    });
    const result = await requestOtp(client, "9876543210");
    expect(result).toMatchObject({ ok: false });
    expect((result as { message: string }).message).toMatch(
      /Can't reach KINRO/,
    );
  });
});

describe("OTP verification", () => {
  it("verifies with the E.164 number and the entered code", async () => {
    const client = makeClient();
    const result = await verifyOtp(client, "9876543210", "123456");
    expect(result).toEqual({ ok: true });
    expect(client.phoneNumber.verify).toHaveBeenCalledWith({
      phoneNumber: "+919876543210",
      code: "123456",
    });
  });

  it("invalid OTP -> asks to check the code", async () => {
    const client = makeClient({
      verify: async () => ({ error: { code: "INVALID_OTP", status: 400 } }),
    });
    const result = await verifyOtp(client, "9876543210", "000000");
    expect(result).toEqual({
      ok: false,
      message: "That code is incorrect. Check it and try again.",
      code: "INVALID_OTP",
    });
  });

  it("expired OTP -> asks for a new code", async () => {
    const client = makeClient({
      verify: async () => ({ error: { code: "OTP_EXPIRED", status: 400 } }),
    });
    const result = await verifyOtp(client, "9876543210", "123456");
    expect(result).toMatchObject({
      ok: false,
      message: "That code has expired. Request a new code.",
    });
  });

  it("no code on file (OTP_NOT_FOUND) is treated like expired", async () => {
    const client = makeClient({
      verify: async () => ({ error: { code: "OTP_NOT_FOUND", status: 400 } }),
    });
    const result = await verifyOtp(client, "9876543210", "123456");
    expect(result).toMatchObject({
      ok: false,
      message: "That code has expired. Request a new code.",
    });
  });

  it("too many wrong attempts -> asks for a new code", async () => {
    const client = makeClient({
      verify: async () => ({
        error: { code: "TOO_MANY_ATTEMPTS", status: 403 },
      }),
    });
    const result = await verifyOtp(client, "9876543210", "123456");
    expect(result).toMatchObject({
      ok: false,
      message: "Too many incorrect attempts. Request a new code.",
    });
  });
});

describe("OTP resend", () => {
  it("re-sends through the same request path to the same number", async () => {
    const sendOtp = vi.fn(async () => ({ error: null }));
    const client = makeClient({ sendOtp });
    await requestOtp(client, "9876543210");
    await requestOtp(client, "9876543210");
    expect(sendOtp).toHaveBeenCalledTimes(2);
    expect(sendOtp).toHaveBeenLastCalledWith({ phoneNumber: "+919876543210" });
  });

  it("a FAILED resend is reported as a failure (the screen must not restart the cooldown)", async () => {
    const client = makeClient({
      sendOtp: async () => ({ error: { status: 429 } }),
    });
    const result = await requestOtp(client, "9876543210");
    expect(result.ok).toBe(false);
  });

  it("uses a 30 second cooldown, formatted m:ss", () => {
    expect(RESEND_COOLDOWN_SECONDS).toBe(30);
    expect(formatCooldown(30)).toBe("0:30");
    expect(formatCooldown(9)).toBe("0:09");
    expect(formatCooldown(0)).toBe("0:00");
    expect(formatCooldown(-3)).toBe("0:00");
    expect(formatCooldown(75)).toBe("1:15");
  });
});

describe("magic link request", () => {
  it("asks for a link that returns to the app root and reports errors on the email screen", async () => {
    const client = makeClient();
    const result = await requestMagicLink(client, "  owner@example.com ");
    expect(result).toEqual({ ok: true });
    expect(client.signIn.magicLink).toHaveBeenCalledWith({
      email: "owner@example.com",
      callbackURL: MAGIC_LINK_CALLBACK_URL,
      errorCallbackURL: MAGIC_LINK_ERROR_CALLBACK_URL,
    });
    expect(MAGIC_LINK_CALLBACK_URL).toBe("/");
    expect(MAGIC_LINK_ERROR_CALLBACK_URL).toBe("/email-link");
  });

  it("surfaces a send failure (e.g. email provider rejected the recipient)", async () => {
    const client = makeClient({
      magicLink: async () => ({ error: { status: 500 } }),
    });
    const result = await requestMagicLink(client, "owner@example.com");
    expect(result).toMatchObject({
      ok: false,
      message: "We couldn't send the sign-in link. Please try again.",
    });
  });

  it("reports being offline", async () => {
    const client = makeClient({
      magicLink: async () => {
        throw new TypeError("Network request failed");
      },
    });
    const result = await requestMagicLink(client, "owner@example.com");
    expect((result as { message: string }).message).toMatch(
      /Can't reach KINRO/,
    );
  });
});
