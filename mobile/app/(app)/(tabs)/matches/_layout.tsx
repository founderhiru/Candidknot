import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

export default function MatchesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Matches" }} />
      <Stack.Screen
        name="[conversationId]/conversation"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
