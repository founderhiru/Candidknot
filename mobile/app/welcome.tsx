import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { HeroImage } from "@/components/HeroImage";
import { colors, spacing, typography } from "@/theme/tokens";

export default function WelcomeScreen() {
  return (
    <HeroImage>
      <View style={styles.content}>
        <Text style={styles.headline}>
          Find the right{"\n"}connections for{"\n"}a brighter tomorrow
        </Text>
        <Text style={styles.supporting}>
          Verified, health-first connections for India's responsible dog owners.
        </Text>
        <View style={styles.actions}>
          <Button
            label="Get Started"
            onPress={() => router.replace("/(app)/(tabs)/discover")}
          />
          <Text
            style={styles.signIn}
            onPress={() => router.push("/(auth)/mobile-number")}
          >
            Already have an account?{" "}
            <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </View>
      </View>
    </HeroImage>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  headline: {
    ...typography.display,
    color: colors.textOnDark,
    lineHeight: 38,
  },
  supporting: {
    ...typography.body,
    color: colors.textOnDarkMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  actions: { gap: spacing.md },
  signIn: {
    ...typography.bodyMuted,
    color: colors.textOnDarkMuted,
    textAlign: "center",
  },
  signInLink: { color: colors.textOnDark, fontWeight: "700" },
});
