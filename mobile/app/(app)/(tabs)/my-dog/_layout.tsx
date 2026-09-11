import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

export default function MyDogLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Dog" }} />
      <Stack.Screen name="add" options={{ title: "Add Dog" }} />
      <Stack.Screen name="[id]/index" options={{ title: "Dog Profile" }} />
      <Stack.Screen name="[id]/edit" options={{ title: "Edit Dog" }} />
      <Stack.Screen name="[id]/health" options={{ headerShown: false }} />
    </Stack>
  );
}
