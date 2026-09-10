import { describe, expect, it } from "vitest";
import {
  isValidIndianMobileNumber,
  maskPhoneForDisplay,
  toE164,
} from "@/lib/phone";

describe("isValidIndianMobileNumber", () => {
  it("accepts a valid 10-digit number starting 6-9", () => {
    expect(isValidIndianMobileNumber("9876543210")).toBe(true);
    expect(isValidIndianMobileNumber("6000000000")).toBe(true);
  });

  it("rejects numbers starting 0-5", () => {
    expect(isValidIndianMobileNumber("5876543210")).toBe(false);
    expect(isValidIndianMobileNumber("0876543210")).toBe(false);
  });

  it("rejects wrong lengths", () => {
    expect(isValidIndianMobileNumber("98765432")).toBe(false);
    expect(isValidIndianMobileNumber("987654321099")).toBe(false);
    expect(isValidIndianMobileNumber("")).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(isValidIndianMobileNumber("98765abcde")).toBe(false);
  });
});

describe("toE164", () => {
  it("prefixes a validated number with +91", () => {
    expect(toE164("9876543210")).toBe("+919876543210");
  });
});

describe("maskPhoneForDisplay", () => {
  it("masks the middle digits, keeping the first and last two", () => {
    expect(maskPhoneForDisplay("9876543210")).toBe("+91 9XXXXXXX10");
  });

  it("returns the input unchanged if not exactly 10 digits", () => {
    expect(maskPhoneForDisplay("123")).toBe("123");
  });
});
