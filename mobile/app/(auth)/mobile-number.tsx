import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";
import { requestOtp } from "@/lib/auth-flows";
import { isValidIndianMobileNumber } from "@/lib/phone";
import { colors, spacing, typography } from "@/theme/tokens";

/**
 * The primary login screen (see the approved consumer-app-style login
 * spec). Google and Email are deliberately secondary/lower-emphasis below
 * the primary field+CTA, not equal-weight tabs.
 *
 * Mobile OTP: requestOtp (src/lib/auth-flows.ts) calls better-auth's
 * phone-number endpoint. Real SMS delivery depends on the backend's
 * SMS_PROVIDER being configured (see /src/lib/sms.ts and /.env.example) — an
 * external setup step, not something this screen fakes.
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
      const result = await requestOtp(authClient, digits);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push({ pathname: "/(auth)/otp", params: { phone: digits } });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (signInError) {
        setError(signInError.message ?? "Google sign-in failed, try again");
        return;
      }
      // The Google OAuth roundtrip runs entirely inside the awaited call
      // above (an in-app browser session — see @better-auth/expo's
      // expoClient plugin), so unlike a deep-link-based return, nothing
      // else ever navigates us away from this screen. By the time we get
      // here the session cookie is already stored; app/index.tsx's
      // useSession()-driven redirect only runs while mounted at "/", so
      // it needs to be explicitly remounted.
      router.replace("/");
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
