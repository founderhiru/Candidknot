// Mobile (Phase mobile-M1) — client-side better-auth instance for Expo.
//
// This is the mobile counterpart of /src/lib/auth-client.ts at the repo
// root. Same three sign-in methods (Google, phone OTP, email magic link),
// same underlying better-auth instance on the server (@/lib/auth there) —
// nothing new is invented here. The only thing genuinely different on
// mobile is the SESSION TRANSPORT:
//
//   Web:    browser stores the session cookie itself; every same-origin
//           fetch() sends it automatically.
//   Mobile: there is no browser or automatic cookie jar, so
//           @better-auth/expo's `expoClient` plugin captures the
//           Set-Cookie response header itself and writes the session
//           cookie into expo-secure-store (iOS Keychain / Android
//           Keystore-backed encrypted storage — never AsyncStorage or a
//           plain file). It re-attaches that stored cookie on every
//           request made *through this authClient* automatically.
//
// Calls made through plain fetch() to our OWN /api/* routes (i.e. not
// through this authClient) do NOT get the cookie attached automatically —
// that is what @/lib/api-client.ts's getStoredSessionCookie() call is for.
import {
  expoClient,
  getSetCookie,
  storageAdapter,
} from "@better-auth/expo/client";
import { magicLinkClient, phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { env } from "./env";
import { persistSessionCookie } from "./magic-link-callback";

// Single source of truth for the SecureStore key @better-auth/expo's
// expoClient plugin derives internally as `${storagePrefix}_cookie` — see
// app/index.tsx, which writes to this same key directly to finish the
// email magic-link sign-in flow (see the comment there for why).
const STORAGE_PREFIX = "canidknot";
export const SESSION_COOKIE_STORAGE_KEY = `${STORAGE_PREFIX}_cookie`;

export const authClient = createAuthClient({
  baseURL: env.apiUrl,
  plugins: [
    magicLinkClient(),
    phoneNumberClient(),
    expoClient({
      scheme: env.appScheme,
      storagePrefix: STORAGE_PREFIX,
      storage: SecureStore,
    }),
  ],
});

export const { useSession, signIn, signOut, phoneNumber } = authClient;

/**
 * Returns the session cookie @better-auth/expo has stored in SecureStore,
 * formatted as a `Cookie` request header value (or an empty string when
 * there is no session). This is the documented escape hatch for attaching
 * the mobile session to plain fetch() calls against our own backend that
 * don't go through authClient itself — see @/lib/api-client.ts.
 */
export async function getStoredSessionCookie(): Promise<string> {
  return authClient.getCookie();
}

/**
 * Finishes an emailed magic-link sign-in. `cookie` is the `?cookie=` value the
 * server appends to the `canidknot:///` deep link (see app/index.tsx): it is
 * merged into the same SecureStore entry expoClient itself uses, then the
 * session store is told to refetch — otherwise an already-running app keeps
 * the signed-out session it cached before the link was opened.
 */
export async function completeMagicLinkSignIn(cookie: string): Promise<void> {
  await persistSessionCookie(cookie, {
    storage: storageAdapter(SecureStore),
    storageKey: SESSION_COOKIE_STORAGE_KEY,
    mergeCookie: getSetCookie,
    notifySessionChanged: () => authClient.$store.notify("$sessionSignal"),
  });
}
