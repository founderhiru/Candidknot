import { describe, expect, it } from "vitest";
import {
  describeMagicLinkSendError,
  describeOtpSendError,
  describeOtpVerifyError,
  isNetworkFailure,
  NETWORK_MESSAGE,
} from "@/lib/auth-errors";

describe("isNetworkFailure", () => {
  it("recognises React Native / fetch network failures", () => {
    expect(isNetworkFailure(new TypeError("Network request failed"))).toBe(
      true,
    );
    expect(isNetworkFailure(new Error("Failed to fetch"))).toBe(true);
    expect(isNetworkFailure({ message: "Network request failed" })).toBe(true);
  });

  it("does not mistake ordinary errors for network failures", () => {
    expect(isNetworkFailure(new Error("Invalid OTP"))).toBe(false);
    expect(isNetworkFailure(null)).toBe(false);
    expect(isNetworkFailure(undefined)).toBe(false);
    expect(isNetworkFailure({ code: "INVALID_OTP" })).toBe(false);
  });
});

describe("error copy", () => {
  it("OTP verify: maps each better-auth code", () => {
    expect(describeOtpVerifyError({ code: "INVALID_OTP" })).toMatch(
      /incorrect/,
    );
    expect(describeOtpVerifyError({ code: "OTP_EXPIRED" })).toMatch(/expired/);
    expect(describeOtpVerifyError({ code: "OTP_NOT_FOUND" })).toMatch(
      /expired/,
    );
    expect(describeOtpVerifyError({ code: "TOO_MANY_ATTEMPTS" })).toMatch(
      /Too many/,
    );
  });

  it("every flow explains 429 and offline the same way", () => {
    for (const describe of [
      describeOtpSendError,
      describeOtpVerifyError,
      describeMagicLinkSendError,
    ]) {
      expect(describe({ status: 429 })).toMatch(/wait a minute/i);
      expect(describe({ message: "Network request failed" })).toBe(
        NETWORK_MESSAGE,
      );
    }
  });

  it("never shows raw server text for unknown failures", () => {
    expect(
      describeOtpSendError({ status: 500, message: "MSG91 authkey invalid" }),
    ).not.toMatch(/MSG91|authkey/);
    expect(describeMagicLinkSendError({ message: "Resend 403" })).not.toMatch(
      /Resend/,
    );
  });
});
