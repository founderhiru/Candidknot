import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/auth-client";
import { resolveInitialRoute, type SessionStatus } from "@/lib/session-guard";
import { colors, typography } from "@/theme/tokens";

/**
 * The app's initial route. better-auth's useSession() restores the session
 * from the SecureStore-persisted cookie (see @/lib/auth-client) — while
 * that's in flight we render the same content as the native splash screen
 * underneath it (see app/_layout.tsx), then redirect once we know whether
 * there's a valid session.
 */
export default function Index() {
  const { data: session, isPending } = useSession();
  const status: SessionStatus = isPending
    ? "loading"
    : session
      ? "authenticated"
      : "unauthenticated";
  const target = resolveInitialRoute(status);

  if (!target) {
    return (
      <View style={styles.container}>
        <Text style={typography.title}>CanidKnot</Text>
        <ActivityIndicator style={styles.spinner} color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={target} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  spinner: {
    marginTop: 24,
  },
});
