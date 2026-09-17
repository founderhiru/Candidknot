// Mobile (Phase mobile-M1) — pure routing-decision logic, deliberately kept
// free of any Expo Router / React Native import so it can be unit-tested
// directly (see tests/unit/session-guard.test.ts).

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export const ROUTES = {
  home: "/(app)/(tabs)/my-dog",
  discover: "/(app)/(tabs)/discover",
  welcome: "/welcome",
} as const;

/**
 * Decides where the root screen (app/index.tsx) should redirect to, given
 * the current session status. Returns null while the status is still
 * loading, meaning "stay on the splash screen — don't redirect yet".
 */
export function resolveInitialRoute(status: SessionStatus): string | null {
  if (status === "loading") {
    return null;
  }
  return status === "authenticated" ? ROUTES.home : ROUTES.welcome;
}
