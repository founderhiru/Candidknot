import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/tokens";

const TAB_BAR_CONTENT_HEIGHT = 54;

/**
 * The approved 4-tab architecture: Home | Discover | Matches | Profile.
 * "Home" is the `my-dog` route repurposed into a dashboard (owner
 * greeting + My Dogs rail) — the route/folder name stays `my-dog` so
 * every existing router.push target elsewhere in the app keeps working;
 * only this tab's title and its screen's content changed. Home is the
 * default landing tab (initialRouteName) for both guests and signed-in
 * owners; Discover remains reachable as its own tab.
 * Messages is intentionally NOT a 5th tab — it's pushed from Matches in
 * later phases.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="my-dog"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        // Explicit background/border/height, computed from the actual
        // safe-area inset rather than left to the platform default: on
        // iOS + New Architecture (see app.json's newArchEnabled) the
        // bottom tab bar can otherwise measure to zero height and
        // disappear even though it's mounted. This guarantees a fixed,
        // always-visible bar that sits above the home indicator.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom || 6,
        },
      }}
    >
      <Tabs.Screen name="my-dog" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="matches" options={{ title: "Matches" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
