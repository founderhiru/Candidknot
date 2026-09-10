import { Tabs } from "expo-router";
import { colors } from "@/theme/tokens";

/**
 * The approved 4-tab architecture: My Dog | Discover | Matches | Profile.
 * Messages is intentionally NOT a 5th tab — it's pushed from Matches in
 * later phases. Discover is the primary/default tab (not the visual
 * center — see the approved spec correction) via initialRouteName.
 */
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="discover"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="my-dog" options={{ title: "My Dog" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="matches" options={{ title: "Matches" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
