import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { HeroImage } from "@/components/HeroImage";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const TRUST_SIGNALS = ["Safe", "Verified", "Community"];

export default function WelcomeScreen() {
  return (
    <HeroImage source={require("../assets/images/welcome-hero.jpg")}>
      <View style={styles.content}>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.headline}>
          Find the right{"\n"}connections for{"\n"}a brighter tomorrow
        </Text>
        <Text style={styles.supporting}>
          A safe, trusted platform for dog owners, built with care.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Get Started"
            onPress={() => router.replace("/(app)/(tabs)/my-dog")}
          />
          <Text
            style={styles.signIn}
            onPress={() => router.push("/(auth)/mobile-number")}
          >
            Already have an account?{" "}
            <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </View>

        <View style={styles.trustRow}>
          {TRUST_SIGNALS.map((label) => (
            <Text key={label} style={styles.trustItem}>
              ✓ {label}
            </Text>
          ))}
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
  dots: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: { backgroundColor: colors.textOnDark, width: 18 },
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
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  trustItem: {
    ...typography.caption,
    color: colors.textOnDarkMuted,
    fontWeight: "600",
  },
});
