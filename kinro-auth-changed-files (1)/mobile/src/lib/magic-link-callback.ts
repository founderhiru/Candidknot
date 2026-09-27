// Finishing an emailed-link sign-in inside the app. Pure logic with injected
// dependencies (no RN/Expo imports) so it is unit-testable — the real wiring
// lives in auth-client.ts (completeMagicLinkSignIn).
//
// Why this exists: the user taps the link from OUTSIDE the app (Mail →
// browser), so the verification request never goes through the app's own
// authClient. The server redirects to `canidknot:///?cookie=<Set-Cookie>`;
// the app must (1) persist that cookie exactly where @better-auth/expo keeps
// its session and (2) tell better-auth's session store to re-read it.
// Step 2 is what was missing — without it a still-running app keeps showing
// the signed-out session it cached before the link was opened.

export interface CookieStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}

export interface PersistSessionCookieDeps {
  storage: CookieStorage;
  /** SecureStore key @better-auth/expo's client reads the session from. */
  storageKey: string;
  /** @better-auth/expo's own `getSetCookie` (merges a Set-Cookie header into the stored JSON). */
  mergeCookie: (setCookieHeader: string, previous?: string) => string;
  /** Tells better-auth's session store to refetch (`$store.notify("$sessionSignal")`). */
  notifySessionChanged: () => void;
}

/** expo-router params can arrive as string | string[]; take the first value. */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ? first : undefined;
}

/**
 * Stores the session cookie from a magic-link deep link and signals the
 * session store.
 */
export async function persistSessionCookie(
  cookie: string,
  deps: PersistSessionCookieDeps,
): Promise<void> {
  const previous = await deps.storage.getItemAsync(deps.storageKey);
  const merged = deps.mergeCookie(cookie, previous ?? undefined);
  await deps.storage.setItemAsync(deps.storageKey, merged);
  deps.notifySessionChanged();
}
