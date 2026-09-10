import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { authClient, useSession } from "@/lib/auth-client";
import { spacing, typography } from "@/theme/tokens";

/**
 * M1 scope for this tab is intentionally limited to what the session-bridge
 * phase needs to prove: showing who's signed in, and logging out cleanly.
 * Owner profile editing/settings are later phases.
 */
export default function ProfileScreen() {
  const { data: session } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      // Clearing the SecureStore-persisted cookie happens inside
      // authClient.signOut() itself (the expo plugin's fetch hook clears
      // stored auth state on a successful sign-out response) — useSession()
      // at (app)/_layout.tsx then redirects to /welcome automatically.
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      {session?.user ? (
        <Text style={styles.identity}>
          Signed in as{" "}
          {session.user.email ?? session.user.phoneNumber ?? session.user.id}
        </Text>
      ) : null}
      <Text style={styles.note}>
        Owner profile and settings arrive in a later phase.
      </Text>
      <Button
        label="Log out"
        onPress={() =>
          Alert.alert("Log out?", "You will need to sign in again.", [
            { text: "Cancel", style: "cancel" },
            { text: "Log out", style: "destructive", onPress: handleLogout },
          ])
        }
        variant="secondary"
        loading={loggingOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, marginTop: spacing.xl },
  identity: { ...typography.bodyMuted, marginTop: spacing.sm },
  note: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
});
