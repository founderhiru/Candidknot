import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthPromptSheet } from "@/components/AuthPromptSheet";
import { Screen } from "@/components/Screen";
import { useRequireAuth } from "@/lib/use-require-auth";
import { colors } from "@/theme/tokens";

/**
 * Defensive guard for screens that are only ever reached from an
 * already-authenticated tab (Add Dog, Edit Dog, Edit Profile) — the normal
 * navigation path never lets a guest tap into these, but a direct deep
 * link could. Shows the same AuthPromptSheet as any other protected
 * action; dismissing it goes back rather than revealing the screen.
 */
export function RequireAuthScreen({ children }: PropsWithChildren) {
  const { isAuthenticated, isSessionPending } = useRequireAuth();

  if (isSessionPending) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen>
        <AuthPromptSheet
          visible
          onClose={() => router.back()}
          message="Sign in to continue."
        />
      </Screen>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
