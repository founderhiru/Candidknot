// Web sign-in phone helper. The server (@/lib/auth) accepts exactly
// "+91" + a 10-digit number starting 6-9 (E.164, no spaces). The web form is
// free text, so normalise what people naturally type before sending.

/**
 * "98765 43210", "+91 98765-43210", "919876543210" → "+919876543210".
 * Anything that isn't recognisably an Indian mobile number is returned
 * stripped of formatting and left for the server to reject with a clear error.
 */
export function normalizeIndianPhone(input: string): string {
  const stripped = input.replace(/[\s\-().]/g, '');
  if (/^[6-9]\d{9}$/.test(stripped)) return `+91${stripped}`;
  if (/^91[6-9]\d{9}$/.test(stripped)) return `+${stripped}`;
  return stripped;
}
