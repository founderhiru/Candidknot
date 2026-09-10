# CanidKnot Mobile (Phase mobile-M1)

Expo (React Native) foundation + authentication session bridge to the
existing CanidKnot Next.js/better-auth backend. **M1 scope only** — see
`/canidknot-mobile-implementation-roadmap.md` at the repo root for what
later phases add.

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local   # point EXPO_PUBLIC_API_URL at your backend
npm run ios      # or: npm run android
```

The backend (repo root) must be running with `MOBILE_APP_SCHEME` set to the
same value as this app's `EXPO_PUBLIC_APP_SCHEME` / `app.json` `scheme`
(default on both sides: `canidknot`).

## Authentication architecture

Same better-auth instance as the web app (`/src/lib/auth.ts`) — no second
auth system, no JWT. The only thing that differs on mobile is **session
transport**:

- **Web:** the browser stores the session cookie and sends it automatically.
- **Mobile:** `@better-auth/expo`'s `expoClient` plugin (see
  `src/lib/auth-client.ts`) intercepts the `Set-Cookie` response header from
  every request made *through* `authClient` and writes it into
  **`expo-secure-store`** — iOS Keychain / Android Keystore-backed encrypted
  storage. It is never written to `AsyncStorage` or a plain file.
- That stored cookie is re-attached automatically to further `authClient`
  requests (sign-in, `useSession()`, sign-out).
- For our own `/api/*` calls that do **not** go through `authClient`
  (dog/health/discovery endpoints in later phases), `src/lib/api-client.ts`
  fetches the stored cookie via `authClient.getCookie()` and attaches it as
  a plain `Cookie` header.
- **Refresh:** unchanged from the web app — better-auth re-validates the
  session against the `Session` row in Postgres on every request
  (`cookieCache: { enabled: false }` in `auth.ts`), and rolls the expiry
  forward at most once/day (`updateAge`). Nothing mobile-specific to
  refresh.
- **Logout:** `authClient.signOut()` (see `app/(app)/(tabs)/profile.tsx`)
  calls better-auth's sign-out endpoint, which revokes the `Session` row
  server-side; the Expo plugin then clears the SecureStore-persisted cookie
  on a successful response. `useSession()` picks up the cleared session and
  `(app)/_layout.tsx`'s guard redirects to `/welcome`.

## Mobile OTP — external dependency, not a code gap

The phone-number sign-in screens (`app/(auth)/mobile-number.tsx`,
`app/(auth)/otp.tsx`) call the real, fully-implemented better-auth
phone-number endpoints. They will not deliver a real SMS until the backend's
`SMS_PROVIDER` is configured (see `/src/lib/sms.ts` at the repo root) — in
development the code is logged to the **server** console instead; in
production the sign-in attempt fails until a real vendor is wired in. No
mobile-side change is needed when that happens.

## Scripts

- `npm start` / `npm run ios` / `npm run android` — Expo dev server
- `npm run lint` — Biome (this project's own `biome.json`, independent of
  the root web app's)
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest, logic-only unit tests (`tests/unit/`) — auth/RN/Expo
  modules are mocked the same way the web app's own tests mock better-auth,
  so these run without a simulator or device.

## Known limitations (M1)

- No app icon/splash image assets yet — Expo's defaults are used.
- Welcome screen is typography-only; hero photography is a design asset
  gap, not a code gap.
- Web target (`expo start --web`) is not supported — `expo-secure-store`
  has no web implementation, and M1's scope is iOS + Android only, per the
  project brief.
- Full `expo-doctor` / real bundling could not be validated in the sandbox
  this was built in (no iOS/Android toolchain or simulator available there)
  — `tsc`, Biome, and Vitest were run directly and are the source of truth
  for this phase's validation.
