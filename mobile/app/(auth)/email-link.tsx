import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { authClient } from "@/lib/auth-client";
import { colors, spacing, typography } from "@/theme/tokens";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailMagicLinkScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: sendError } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/",
      });
      if (sendError) {
        setError(sendError.message ?? "Couldn't send link, try again");
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't send link, try again");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={typography.title}>Check your email</Text>
          <Text style={[typography.bodyMuted, styles.subtitle]}>
            We sent a sign-in link to {email}. Open it on this device to
            continue.
          </Text>
        </View>
        <Pressable onPress={() => setSent(false)} accessibilityRole="button">
          <Text style={[typography.bodyMuted, styles.link]}>
            Use a different email
          </Text>
        </Pressable>
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
        <Button
          label="Send Magic Link"
          onPress={handleSend}
          loading={loading}
        />
      </View>

      <Pressable
        onPress={() => router.back()}
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
  footer: { marginTop: spacing.xl, alignItems: "center" },
  link: { color: colors.accent, fontWeight: "600" },
});
