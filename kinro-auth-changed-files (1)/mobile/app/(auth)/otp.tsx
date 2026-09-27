import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ErrorText } from "@/components/ErrorText";
import { OtpInput } from "@/components/OtpInput";
import { Screen } from "@/components/Screen";
import { authClient } from "@/lib/auth-client";
import {
  formatCooldown,
  RESEND_COOLDOWN_SECONDS,
  requestOtp,
  verifyOtp,
} from "@/lib/auth-flows";
import { maskPhoneForDisplay } from "@/lib/phone";
import { useCooldown } from "@/lib/use-cooldown";
import { colors, spacing, typography } from "@/theme/tokens";

export default function OtpVerificationScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const digits = phone ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // A code was sent just before this screen opened, so the cooldown starts now.
  const { remaining: cooldown, start: startCooldown } = useCooldown(
    RESEND_COOLDOWN_SECONDS,
  );
  // OtpInput fires onComplete on every change that reaches 6 digits; the ref
  // (unlike `loading` state) blocks a second submit within the same tick.
  const submitting = useRef(false);

  async function handleComplete(otp: string) {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const result = await verifyOtp(authClient, digits, otp);
      if (!result.ok) {
        setError(result.message);
        setCode("");
        return;
      }
      // The session cookie is already stored and the session store signalled
      // (@better-auth/expo does both on the verify response). app/index.tsx's
      // useSession()-driven redirect only runs while mounted at "/", and we
      // navigated away from it to get here, so remount it explicitly.
      router.replace("/");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending || loading) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const result = await requestOtp(authClient, digits);
      if (!result.ok) {
        // Cooldown deliberately NOT restarted: nothing was sent.
        setError(result.message);
        return;
      }
      setCode("");
      setNotice("New code sent.");
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setResending(false);
    }
  }

  const canResend = cooldown === 0 && !resending && !loading;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.title}>Enter code</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>
          Code sent to {maskPhoneForDisplay(digits)}
        </Text>
      </View>

      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={handleComplete}
        disabled={loading}
      />
      {loading ? (
        <Text style={[typography.bodyMuted, styles.status]}>Verifying…</Text>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {notice && !error ? (
        <Text style={[typography.bodyMuted, styles.status]}>{notice}</Text>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          onPress={handleResend}
          disabled={!canResend}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canResend }}
        >
          <Text style={[typography.bodyMuted, canResend && styles.link]}>
            {cooldown > 0
              ? `Resend OTP in ${formatCooldown(cooldown)}`
              : resending
                ? "Sending…"
                : "Resend OTP"}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[typography.bodyMuted, styles.link]}>Change number</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.xl },
  subtitle: { marginTop: spacing.xs },
  status: { marginTop: spacing.sm },
  footer: { marginTop: spacing.xl, gap: spacing.md, alignItems: "center" },
  link: { color: colors.accent, fontWeight: "600" },
});
