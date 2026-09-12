import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ErrorText } from "@/components/ErrorText";
import { OtpInput } from "@/components/OtpInput";
import { Screen } from "@/components/Screen";
import { authClient } from "@/lib/auth-client";
import { maskPhoneForDisplay } from "@/lib/phone";
import { colors, spacing, typography } from "@/theme/tokens";

const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpVerificationScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const digits = phone ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleComplete(otp: string) {
    setError(null);
    setLoading(true);
    try {
      const { error: verifyError } = await authClient.phoneNumber.verify({
        phoneNumber: `+91${digits}`,
        code: otp,
      });
      if (verifyError) {
        setError(verifyError.message ?? "Incorrect code, try again");
        setCode("");
        return;
      }
      // The session cookie is already stored at this point (a normal
      // fetch response, captured directly by @better-auth/expo's client
      // plugin) — but app/index.tsx's useSession()-driven redirect only
      // runs while mounted at "/", and we navigated away from it to get
      // here, so it needs to be explicitly remounted.
      router.replace("/");
    } catch {
      setError("Incorrect code, try again");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    try {
      await authClient.phoneNumber.sendOtp({ phoneNumber: `+91${digits}` });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Couldn't resend code, try again");
    }
  }

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
      {error ? <ErrorText>{error}</ErrorText> : null}

      <View style={styles.footer}>
        <Pressable
          onPress={handleResend}
          disabled={cooldown > 0}
          accessibilityRole="button"
        >
          <Text style={[typography.bodyMuted, cooldown === 0 && styles.link]}>
            {cooldown > 0
              ? `Resend OTP in 0:${cooldown.toString().padStart(2, "0")}`
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
  footer: { marginTop: spacing.xl, gap: spacing.md, alignItems: "center" },
  link: { color: colors.accent, fontWeight: "600" },
});
