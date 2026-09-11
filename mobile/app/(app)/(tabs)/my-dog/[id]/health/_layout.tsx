import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

export default function HealthPassportLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Health Passport" }} />
      <Stack.Screen name="add" options={{ title: "Add Health Record" }} />
      <Stack.Screen name="[recordId]/edit" options={{ title: "Edit Record" }} />
    </Stack>
  );
}
