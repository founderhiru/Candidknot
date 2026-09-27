# Kinro Mobile (Phase mobile-M1)

Expo (React Native) foundation + authentication session bridge to the
existing Kinro Next.js/better-auth backend. **M1 scope only** — see
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

## Sign-in methods and what each needs

All three go through the same better-auth instance and end the same way: the
session cookie lands in `expo-secure-store`, `useSession()` updates, and the
app routes home. Google is unchanged.

### Mobile OTP (SMS)

`mobile-number.tsx` → `otp.tsx`, logic in `src/lib/auth-flows.ts`
(`requestOtp` / `verifyOtp`; error copy in `src/lib/auth-errors.ts`).
Number → code → verify; wrong / expired / too-many-attempts codes get specific
messages; **Resend** unlocks after 30 s and a *failed* resend does not restart
the timer. Codes are valid 10 minutes, 5 attempts.

It cannot deliver a real SMS until the **backend** has an SMS provider
configured (`SMS_PROVIDER=msg91` + `MSG91_AUTH_KEY` + `MSG91_OTP_TEMPLATE_ID`
— see `/.env.example` and `/src/lib/sms.ts`). Until then the code is only
logged to the server console (dev) or sign-in fails (production). No app
change is needed when a provider is added. The server accepts only
`+91` + a 10-digit number starting 6–9.

### Email magic link

1. `email-link.tsx` requests a link (`callbackURL: "/"`,
   `errorCallbackURL: "/email-link"`); Resend emails
   `<NEXT_PUBLIC_APP_URL>/api/auth/magic-link/verify?token=…`.
2. Opening it verifies on the server, which redirects to
   `canidknot:///?cookie=<session>` (success) or
   `canidknot:///email-link?error=INVALID_TOKEN` (expired / already used).
3. `app/index.tsx` calls `completeMagicLinkSignIn()` (`src/lib/auth-client.ts`):
   stores the cookie **and signals better-auth's session store to refetch**
   (without that signal an already-running app stays signed out), then the
   normal session redirect takes over. Bad links show a message on the email
   screen.

Links expire after 10 minutes and work once. Open the email **on the same
phone**, in Safari/Chrome (some in-app mail browsers block redirects into
custom-scheme apps — a known limitation of custom-scheme deep links; Universal
Links / App Links are the follow-up if it matters).

### Environment for real devices

- **EAS:** `EXPO_PUBLIC_API_URL` = the backend's public https origin (not
  set in `eas.json`; see `.env.example` for the `eas env:create` command).
  `EXPO_PUBLIC_APP_SCHEME` = `canidknot` is already set in `eas.json`.
- **Backend (Render):** `NEXT_PUBLIC_APP_URL` = the same public https origin,
  `MOBILE_APP_SCHEME=canidknot://` (default), `RESEND_API_KEY`, `EMAIL_FROM`
  on a Resend-verified domain, and the SMS variables above.
- **Deep-link identity:** scheme `canidknot`; iOS bundle ID and Android
  package `com.canidknot.app` (unchanged). The scheme is registered in
  `app.json` and the committed `ios/CanidKnot/Info.plist`.
- Testing: `npm test` covers the flow logic; the full server behaviour is in
  the root `tests/unit/auth/auth-flows.integration.test.ts`. A real SMS / email
  / deep-link round trip can only be checked on a device with the backend
  configured.

## Scripts

- `npm start` / `npm run ios` / `npm run android` — Expo dev server
- `npm run ios:dev` — start Metro if needed and open the app in the booted
  simulator; `npm run start:dev` / `npm run ios:open` are its two halves
  (see *Running on Xcode 27* above)
- `npm run lint` — Biome (this project's own `biome.json`, independent of
  the root web app's)
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest, logic-only unit tests (`tests/unit/`) — auth/RN/Expo
  modules are mocked the same way the web app's own tests mock better-auth,
  so these run without a simulator or device.

## Running on Xcode 27 (Device Hub)

Xcode 27 removed `Simulator.app`; its replacement is **Device Hub**
(`DeviceHub.app`, bundle id `com.apple.dt.Devices`). Expo CLI 0.22.28 — the
version Expo SDK 52 pins — only knows about `Simulator.app`, so on Xcode 27
`expo start` (press `i`) and `expo run:ios` stop with
`Can't determine id of Simulator app`.

**What we do about it.** Expo fixed this upstream for SDK 56+
([expo/expo#46757](https://github.com/expo/expo/pull/46757),
[#46809](https://github.com/expo/expo/pull/46809)) but is not backporting to
SDK 52. `patches/@expo+cli+0.22.28.patch` is a small backport of that change,
applied automatically by `patch-package` on every `npm install`
(`postinstall`). It does three things and leaves Xcode 26 behaviour unchanged:

- `SimulatorAppPrerequisite`: accepts Simulator *or* Device Hub.
- `ensureSimulatorAppRunning`: counts either process; if `open -a Simulator`
  fails, opens `devices://device/open?id=<udid>` (or `open -a DeviceHub`).
- `AppleDeviceManager.activateWindowAsync`: raises whichever app exists.

**Daily workflow**

```bash
npm install          # applies the patch; you should see "@expo/cli@0.22.28 ✔"
npm run ios:dev      # starts Metro if needed, then opens the app in the booted simulator
```

`npm run ios:dev` keeps Metro attached in that terminal (reload the app with
Cmd+R in the simulator, stop everything with Ctrl+C). If you prefer to run Metro
yourself: `npm run start:dev` in one terminal, then `npm run ios:open` in another.
Before launching, `ios:dev` builds the app's JavaScript and prints Metro's real
error if that fails, so you never have to guess from a blank or red screen. The
first build after a fresh start can take a minute or two.

Avoid pressing `i` in the Metro terminal straight after starting Metro: the app
gives up quickly when Metro is not ready yet and shows a white or red screen.
`npm run ios:dev` waits for Metro and the first build, then launches.

**Red screen "No script URL provided ... unsanitizedScriptURLString = (null)".**
This is a plain React Native debug build (no `expo-dev-client`): at launch it
asks Metro on `localhost:8081` for the JavaScript. The message means **Metro was
not running (or not on port 8081) when the app started**, not that the app is
broken. Start Metro (`npm run start:dev`) and press Cmd+R in the simulator, or
just use `npm run ios:dev`. If port 8081 is taken by another project's Metro,
stop that one first (`lsof -i :8081`).

`ios:open` / `ios:dev` only use `simctl` and Device Hub's `devices://` link and
never need the Simulator app, so they keep working however Apple changes the
simulator UI. They refuse to launch the app when Metro is down and say why.

**Testing as a guest.** The simulator remembers your login, so the app opens straight
into Home. To test the signed-out flow (Splash, Welcome, Skip, guest Home) run
`npm run ios:signout` (clears the simulator's saved login), then
`npm run ios:open`. You can also use the **Log out** button at the top right of
the Profile tab.

**Scrolling in Device Hub.** In Xcode 27's Device Hub, clicks are sent to the app
as pointer touches, so click-and-drag does not scroll. Scroll with a two-finger
swipe on the trackpad (or a mouse wheel) while the pointer is over the device
(see Apple's Xcode 27 release notes: "Common Mac mouse and trackpad gestures
such as scrolling ... now work with standard UIKit components").

**Use an iOS 26.x simulator, not iOS 27.** Apps built with the iOS 27 SDK must
adopt the UIKit scene lifecycle, and Expo has no supported way to do that on
SDK 52 (tracked in [expo/expo#46664](https://github.com/expo/expo/issues/46664)).
Pick an iOS 26.x device (for example *iPhone 17 Pro, iOS 26.5*) in Device Hub.

**Never run `npx expo@latest ...` in this project.** It downloads a CLI for a
newer SDK and Metro then fails with
`Failed to replace react-native/Libraries/Utilities/HMRClient.js`. Always use
the project's own CLI (`npx expo ...` or the npm scripts above).

**Removing the patch.** When the project moves to Expo SDK 56 or newer, delete
`patches/@expo+cli+0.22.28.patch` (and `patch-package` plus the `postinstall`
script if no other patches remain). `patch-package` will warn if `@expo/cli`
changes version while the patch is still present.

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
