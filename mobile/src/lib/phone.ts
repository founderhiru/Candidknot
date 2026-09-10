// Mobile (Phase mobile-M1) — validation for the consumer-app-style login
// (+91 hardcoded for MVP, per the approved login UX spec). Kept as a pure
// function so it's unit-testable without any RN/Expo runtime.

/** A valid Indian mobile number: exactly 10 digits, starting 6-9. */
export function isValidIndianMobileNumber(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

/** Formats a validated 10-digit number as the E.164 string better-auth expects. */
export function toE164(digits: string): string {
  return `+91${digits}`;
}

/** Masks all but the last 2 digits, for the "code sent to +91 9XXXXXXX10" confirmation copy. */
export function maskPhoneForDisplay(digits: string): string {
  if (digits.length !== 10) {
    return digits;
  }
  return `+91 ${digits[0]}XXXXXXX${digits.slice(8)}`;
}
