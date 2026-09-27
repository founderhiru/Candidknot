import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";
import { describeMagicLinkCallbackError } from "@/lib/auth-errors";
import {
  formatCooldown,
  RESEND_COOLDOWN_SECONDS,
  requestMagicLink,
} from "@/lib/auth-flows";
import { firstParam } from "@/lib/magic-link-callback";
import { useCooldown } from "@/lib/use-cooldown";
import { colors, spacing, typography } from "@/theme/tokens";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailMagicLinkScreen() {
  // `error` is set when the user lands here from an emailed link that could
  // not be used (expired / already opened) — see app/index.tsx and
  // MAGIC_LINK_ERROR_CALLBACK_URL in src/lib/auth-flows.ts.
  const params = useLocalSearchParams<{ error?: string | string[] }>();
  const linkError = firstParam(params.error);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError ? describeMagicLinkCallbackError(linkError) : null,
  );
  const [sent, setSent] = useState(false);
  const { remaining: cooldown, start: startCooldown } = useCooldown();

  async function send() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await requestMagicLink(authClient, email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSent(true);
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setLoading(false);
    }
  }

  // The app can be opened directly on this screen by an emailed link, so
  // there may be no history to go back to.
  function goToMobileNumber() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/mobile-number");
    }
  }

  if (sent) {
    const canResend = cooldown === 0 && !loading;
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={typography.title}>Check your email</Text>
          <Text style={[typography.bodyMuted, styles.subtitle]}>
            We sent a sign-in link to {email.trim()}. Open it on this phone to
            continue. It expires in 10 minutes.
          </Text>
        </View>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <View style={styles.sentActions}>
          <Pressable
            onPress={send}
            disabled={!canResend}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canResend }}
          >
            <Text style={[typography.bodyMuted, canResend && styles.link]}>
              {cooldown > 0
                ? `Resend link in ${formatCooldown(cooldown)}`
                : loading
                  ? "Sending…"
                  : "Resend link"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setError(null);
              setSent(false);
            }}
            accessibilityRole="button"
          >
            <Text style={[typography.bodyMuted, styles.link]}>
              Use a different email
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.title}>Sign in with email</Text>
      </View>

      <TextField
        label="Email address"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!loading}
        autoFocus
        placeholder="you@example.com"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}

      <View style={styles.sendButton}>
        <Button label="Send Magic Link" onPress={send} loading={loading} />
      </View>

      <Pressable
        onPress={goToMobileNumber}
        accessibilityRole="button"
        style={styles.footer}
      >
        <Text style={[typography.bodyMuted, styles.link]}>
          Use mobile number instead
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.lg },
  subtitle: { marginTop: spacing.sm },
  sendButton: { marginTop: spacing.lg },
  sentActions: { marginTop: spacing.lg, gap: spacing.md },
  footer: { marginTop: spacing.xl, alignItems: "center" },
  link: { color: colors.accent, fontWeight: "600" },
});
