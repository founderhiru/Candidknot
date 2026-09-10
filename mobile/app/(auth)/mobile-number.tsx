import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";
import { isValidIndianMobileNumber } from "@/lib/phone";
import { colors, spacing, typography } from "@/theme/tokens";

/**
 * The primary login screen (see the approved consumer-app-style login
 * spec). Google and Email are deliberately secondary/lower-emphasis below
 * the primary field+CTA, not equal-weight tabs.
 *
 * IMPORTANT — Mobile OTP dependency: sendOtp below calls the real
 * better-auth phone-number endpoint, which is fully implemented, but the
 * backend's SMS_PROVIDER is not yet configured (see /src/lib/sms.ts at the
 * repo root) — in development it logs the code to the SERVER console
 * instead of sending a real SMS, and it throws in production until a real
 * vendor is wired in. This screen has no knowledge of that and needs no
 * change once a vendor is added; it is a pure external configuration gap,
 * not something to fake here.
 */
export default function MobileNumberScreen() {
  const [digits, setDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = isValidIndianMobileNumber(digits) && !loading;

  async function handleContinue() {
    if (!isValidIndianMobileNumber(digits)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: sendError } = await authClient.phoneNumber.sendOtp({
        phoneNumber: `+91${digits}`,
      });
      if (sendError) {
        setError(sendError.message ?? "Couldn't send code, try again");
        return;
      }
      router.push({ pathname: "/(auth)/otp", params: { phone: digits } });
    } catch {
      setError("Couldn't send code, try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } catch {
      setError("Google sign-in failed, try again");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.title}>Sign in</Text>
      </View>

      <TextField
        label="Mobile number"
        prefix="+91"
        value={digits}
        onChangeText={(text) => {
          setDigits(text.replace(/[^0-9]/g, "").slice(0, 10));
          if (error) setError(null);
        }}
        keyboardType="number-pad"
        autoComplete="tel"
        maxLength={10}
        editable={!loading}
        autoFocus
        placeholder="10-digit number"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}

      <View style={styles.continueButton}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!canContinue}
          loading={loading}
        />
      </View>

      <View style={styles.secondary}>
        <Button
          label="Continue with Google"
          onPress={handleGoogle}
          variant="secondary"
        />
        <Pressable
          style={styles.emailLink}
          onPress={() => router.push("/(auth)/email-link")}
          accessibilityRole="button"
        >
          <Text style={[typography.bodyMuted, styles.emailLinkText]}>
            Use email instead
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.lg },
  continueButton: { marginTop: spacing.lg },
  secondary: { marginTop: spacing.xl, gap: spacing.md },
  emailLink: { alignItems: "center", paddingVertical: spacing.sm },
  emailLinkText: { color: colors.accent, fontWeight: "600" },
});
