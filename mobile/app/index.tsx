import { getSetCookie, storageAdapter } from "@better-auth/expo/client";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { SESSION_COOKIE_STORAGE_KEY, useSession } from "@/lib/auth-client";
import { resolveInitialRoute, type SessionStatus } from "@/lib/session-guard";
import { colors, spacing, typography } from "@/theme/tokens";

/**
 * Full-bleed splash matching the brand reference (large dog-photography
 * moment first). PhotoPlaceholder's "deep" tone stands in for real hero
 * photography — see assets/images/README.md for the swap-in path once
 * real photos exist.
 */
function LoadingSplash() {
  return (
    <PhotoPlaceholder tone="deep" style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.wordmark}>Kinro</Text>
        <Text style={styles.tagline}>Dogs bring people closer</Text>
        <ActivityIndicator style={styles.spinner} color={colors.textOnDark} />
      </View>
    </PhotoPlaceholder>
  );
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
    return <LoadingSplash />;
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
 * (see /src/lib/auth.ts) already appends the resulting session cookie as
 * a `?cookie=` query param on the deep-link redirect for exactly this
 * reason; the missing piece was reading it. This does that: if the app
 * was opened with a `cookie` param, persist it to the same SecureStore
 * key @better-auth/expo's expoClient plugin itself uses (via that
 * plugin's own exported helpers — no separate storage scheme), then let
 * useSession() below pick it up on its normal initial fetch.
 */
export default function Index() {
  const { cookie } = useLocalSearchParams<{ cookie?: string }>();
  const [ready, setReady] = useState(!cookie);

  useEffect(() => {
    if (!cookie) return;
    let active = true;
    (async () => {
      try {
        const storage = storageAdapter(SecureStore);
        const current = await storage.getItemAsync(SESSION_COOKIE_STORAGE_KEY);
        const merged = getSetCookie(cookie, current ?? undefined);
        await storage.setItemAsync(SESSION_COOKIE_STORAGE_KEY, merged);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [cookie]);

  if (!ready) {
    return <LoadingSplash />;
  }

  return <SessionRedirect />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  copy: {
    alignItems: "center",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.screenPadding,
  },
  wordmark: {
    ...typography.display,
    color: colors.textOnDark,
  },
  tagline: {
    ...typography.body,
    color: colors.textOnDarkMuted,
    marginTop: spacing.xs,
  },
  spinner: {
    marginTop: spacing.lg,
  },
});
