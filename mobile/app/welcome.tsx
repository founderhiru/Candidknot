import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { spacing, typography } from "@/theme/tokens";

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.spacer} />
      <View style={styles.hero}>
        <Text style={typography.title}>CanidKnot</Text>
        <Text style={[typography.bodyMuted, styles.tagline]}>
          Verified, health-first breeding connections for India's responsible
          dog owners.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label="Get Started"
          onPress={() => router.push("/(auth)/mobile-number")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 1 },
  hero: { flex: 2, justifyContent: "center" },
  tagline: { marginTop: spacing.sm },
  actions: { paddingBottom: spacing.lg },
});
