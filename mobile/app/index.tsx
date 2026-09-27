import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { SplashView } from "@/components/SplashView";
import { completeMagicLinkSignIn, useSession } from "@/lib/auth-client";
import { firstParam } from "@/lib/magic-link-callback";
import { resolveInitialRoute, type SessionStatus } from "@/lib/session-guard";

/**
 * The KINRO launch screen (photo, logo, headline). While the session is
 * still resolving it shows a spinner; once we know the visitor is signed
 * out, the same screen offers the round arrow that continues to Home.
 */
function LoadingSplash() {
  return <SplashView />;
}

/**
 * Reads useSession() and redirects once we know whether there's a valid
 * session. Split out from Index below so it never mounts (and so
 * useSession() never fires its underlying /get-session fetch) until any
 * incoming `cookie` param has already been written to storage — otherwise
 * that fetch could race the write and read the stored cookie before it
 * exists.
 */
function SessionRedirect() {
  const { data: session, isPending } = useSession();
  const status: SessionStatus = isPending
    ? "loading"
    : session
      ? "authenticated"
      : "unauthenticated";
  const target = resolveInitialRoute(status);

  if (!target) {
    // Rendered as <SplashView /> directly (not via LoadingSplash) so React keeps
    // the same instance when the signed-out state arrives and the logo
    // animation is not restarted by a remount.
    return <SplashView />;
  }

  // Signed-out visitors see the hero photo screen and tap the arrow to
  // continue to Home (the guest Home). Signed-in users skip straight to Home.
  // The animated launch splash in app/_layout.tsx plays on top first.
  if (status === "unauthenticated") {
    return <SplashView onContinue={() => router.replace(target)} />;
  }

  return <Redirect href={target} />;
}

/**
 * The app's initial route — and the deep-link landing point every
 * mobile sign-in flow's callbackURL/newUserCallbackURL points at ("/",
 * which @better-auth/expo's client resolves to this app's own
 * `<scheme>://` root; see mobile-number.tsx, otp.tsx, email-link.tsx).
 *
 * Google and Mobile OTP finish entirely inside an awaited authClient call
 * (an in-app browser session for Google, a plain fetch for OTP) — for
 * those, @better-auth/expo's client plugin already stores the session
 * cookie itself, and the screens that trigger them explicitly
 * `router.replace("/")` afterward to land here.
 *
 * Email magic-link is different: the user taps the link from OUTSIDE the
 * app (Mail -> a browser), so verification happens on a completely
 * separate HTTP exchange the app's own authClient never sees — nothing
 * would otherwise persist that session. The server's `expo()` plugin
 * (see /src/lib/auth.ts) appends the resulting session cookie as a
 * `?cookie=` query param on the deep-link redirect. This reads it and
 * calls completeMagicLinkSignIn (auth-client.ts), which stores the cookie
 * AND tells better-auth's session store to refetch — the second half is
 * what lets an already-running app (the normal case: the user was waiting
 * on the "check your email" screen) pick the session up.
 *
 * A link that can't be used (expired / already opened) reaches the app as
 * `?error=<code>`; new builds route that to the email screen directly via
 * errorCallbackURL, and this also catches it here for older builds' links.
 */
export default function Index() {
  const params = useLocalSearchParams<{
    cookie?: string | string[];
    error?: string | string[];
  }>();
  const cookie = firstParam(params.cookie);
  const linkError = firstParam(params.error);
  const [ready, setReady] = useState(!cookie);

  useEffect(() => {
    if (!cookie) return;
    let active = true;
    (async () => {
      try {
        await completeMagicLinkSignIn(cookie);
      } catch {
        // Storage failure: fall through to the normal signed-out path rather
        // than trapping the user on the splash screen.
      } finally {
        if (active) {
          setReady(true);
          // The token must not linger in the route: re-mounting "/" (e.g.
          // back-navigation after logout) would otherwise replay it.
          router.setParams({ cookie: undefined });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [cookie]);

  if (linkError) {
    return (
      <Redirect
        href={{ pathname: "/(auth)/email-link", params: { error: linkError } }}
      />
    );
  }

  return !ready ? <LoadingSplash /> : <SessionRedirect />;
}
