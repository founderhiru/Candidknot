// Mobile (Phase mobile-M1) — small, dependency-free env accessor.
//
// Expo inlines EXPO_PUBLIC_* vars into the JS bundle at build time (same
// convention as the web app's NEXT_PUBLIC_* vars — see /src/lib/env.ts at
// the repo root). There is no server runtime here to validate against, so
// this is intentionally simple: read the two vars this app needs, fall back
// to sane local-dev defaults, and let a genuinely missing prod value surface
// as a loud network error rather than a silent wrong guess.

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? "canidknot";

export const env = {
  apiUrl,
  appScheme,
};

// A release build that still points at localhost can never reach the backend
// from a real phone — every sign-in request would fail with a generic network
// error. EXPO_PUBLIC_API_URL must be provided to EAS builds (see README →
// "Environment for real devices"); surface the mistake loudly instead.
if (
  typeof __DEV__ !== "undefined" &&
  !__DEV__ &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(apiUrl)
) {
  // biome-ignore lint/suspicious/noConsole: one-time misconfiguration warning.
  console.warn(
    `[kinro] EXPO_PUBLIC_API_URL is "${apiUrl}" in a release build — the app cannot reach the backend from a device. Set it as an EAS environment variable.`,
  );
}
