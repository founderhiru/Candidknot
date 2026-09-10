import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSession } from "@/lib/auth-client";
import { colors } from "@/theme/tokens";

/**
 * Route guard for the entire authenticated section. Mirrors the same
 * session check app/index.tsx does — duplicated deliberately rather than
 * shared, because this one also has to cover a session that *expires*
 * while the user is already inside the app (index.tsx only covers the
 * initial cold-start redirect).
 */
export default function AppLayout() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
