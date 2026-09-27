// The request/verify/resend logic for the two non-Google sign-in flows, kept
// out of the screens so it can be unit-tested without React Native. Screens
// own only UI state (inputs, spinners, navigation).
//
// These call the SAME better-auth client as everything else (auth-client.ts) —
// no second auth system, no custom OTP/token code. On success the expoClient
// plugin has already stored the session cookie and signalled the session
// store, so callers only need to navigate.
import {
  type AuthErrorLike,
  describeMagicLinkSendError,
  describeOtpSendError,
  describeOtpVerifyError,
  isNetworkFailure,
  NETWORK_MESSAGE,
} from "./auth-errors";
import { toE164 } from "./phone";

/** Seconds before "Resend" unlocks, for both OTP and magic link. */
export const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Where the server sends the user when an emailed link can't be used (expired,
 * already opened, ...). A relative path — @better-auth/expo resolves it to this
 * app's own `canidknot:///email-link` deep link.
 */
export const MAGIC_LINK_ERROR_CALLBACK_URL = "/email-link";

/** Where a successfully verified emailed link lands (the app root). */
export const MAGIC_LINK_CALLBACK_URL = "/";

export type FlowResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

interface AuthResponse {
  error?: AuthErrorLike | null;
}

/** The slice of the better-auth client these flows use (injectable for tests). */
export interface AuthFlowClient {
  phoneNumber: {
    sendOtp(input: { phoneNumber: string }): Promise<AuthResponse>;
    verify(input: { phoneNumber: string; code: string }): Promise<AuthResponse>;
  };
  signIn: {
    magicLink(input: {
      email: string;
      callbackURL: string;
      errorCallbackURL: string;
    }): Promise<AuthResponse>;
  };
}

async function guarded(
  run: () => Promise<AuthResponse>,
  describe: (error: AuthErrorLike | null | undefined) => string,
): Promise<FlowResult> {
  try {
    const { error } = await run();
    if (error) {
      return { ok: false, message: describe(error), code: error.code };
    }
    return { ok: true };
  } catch (thrown) {
    // fetch() itself rejected — offline, DNS, TLS, timeout.
    return {
      ok: false,
      message: isNetworkFailure(thrown) ? NETWORK_MESSAGE : describe(null),
    };
  }
}

/** Step 1: send (or re-send) an OTP to a validated 10-digit Indian number. */
export function requestOtp(
  client: AuthFlowClient,
  digits: string,
): Promise<FlowResult> {
  return guarded(
    () => client.phoneNumber.sendOtp({ phoneNumber: toE164(digits) }),
    describeOtpSendError,
  );
}

/** Step 2: verify the code. Success means a session now exists. */
export function verifyOtp(
  client: AuthFlowClient,
  digits: string,
  code: string,
): Promise<FlowResult> {
  return guarded(
    () => client.phoneNumber.verify({ phoneNumber: toE164(digits), code }),
    describeOtpVerifyError,
  );
}

/** Request an emailed sign-in link. */
export function requestMagicLink(
  client: AuthFlowClient,
  email: string,
): Promise<FlowResult> {
  return guarded(
    () =>
      client.signIn.magicLink({
        email: email.trim(),
        callbackURL: MAGIC_LINK_CALLBACK_URL,
        errorCallbackURL: MAGIC_LINK_ERROR_CALLBACK_URL,
      }),
    describeMagicLinkSendError,
  );
}

/** Formats a cooldown for the Resend button: 30 -> "0:30". */
export function formatCooldown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, "0")}`;
}
