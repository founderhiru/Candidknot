import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { spacing, typography } from "@/theme/tokens";

interface AuthPromptSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Optional context-specific line, e.g. "Sign in to add a dog." Falls back to a generic message. */
  message?: string;
}

/**
 * The one "sign in to continue" prompt every protected action routes
 * through — see useRequireAuth. Continuing takes the guest through the
 * EXISTING auth flow (Mobile OTP primary, Google/Email secondary) — no new
 * auth logic here, just a clean interruption point.
 */
export function AuthPromptSheet({
  visible,
  onClose,
  message,
}: AuthPromptSheetProps) {
  function handleContinue() {
    onClose();
    router.push("/(auth)/mobile-number");
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Sign in to continue"
    >
      <Text style={[typography.body, styles.message]}>
        {message ?? "Create a free Kinro account to continue."}
      </Text>
      <View style={styles.actions}>
        <Button label="Continue" onPress={handleContinue} />
        <Button label="Not now" onPress={onClose} variant="secondary" />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  message: { marginBottom: spacing.lg },
  actions: { gap: spacing.sm },
});
