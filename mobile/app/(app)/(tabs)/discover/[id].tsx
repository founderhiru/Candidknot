import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthPromptSheet } from "@/components/AuthPromptSheet";
import { HealthBadge, VerifiedBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { getCachedDiscoverDog } from "@/lib/discover-cache";
import { useRequireAuth } from "@/lib/use-require-auth";
import { colors, spacing, typography } from "@/theme/tokens";

const HERO_HEIGHT = 300;

/**
 * Public Dog Detail — no auth required to view (guest-first). There is no
 * public single-dog API (see discover-cache.ts) so this reads the item the
 * Discover list already fetched, by id. If that cache is empty (e.g. a
 * cold deep link straight into this screen), it shows a clear way back
 * rather than a fake/partial fetch.
 */
export default function PublicDogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dog = getCachedDiscoverDog(id);
  const { promptVisible, setPromptVisible, requireAuth } = useRequireAuth();

  if (!dog) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't find this dog"
          message="Go back to Discover and try again."
          actionLabel="Back to Discover"
          onAction={() => router.replace("/(app)/(tabs)/discover")}
        />
      </Screen>
    );
  }

  function handleExpressInterest() {
    requireAuth(() => {
      Alert.alert(
        "Coming soon",
        "Expressing interest isn't available yet — we'll let you know when it launches.",
      );
    });
  }

  return (
    <Screen noPadding edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {dog.coverPhotoUrl ? (
          <Image source={{ uri: dog.coverPhotoUrl }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Text style={styles.heroPlaceholderEmoji}>🐾</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={typography.title}>{dog.name}</Text>
          <Text style={[typography.bodyMuted, styles.subtitle]}>
            {dog.breed} · {dog.sex} · {dog.ageYears}{" "}
            {dog.ageYears === 1 ? "yr" : "yrs"} · {dog.city}
            {dog.distanceKm != null ? ` · ${dog.distanceKm} km away` : ""}
          </Text>

          <View style={styles.badgeRow}>
            {dog.isVerified ? <VerifiedBadge /> : null}
            <HealthBadge hasRecords={dog.hasHealthRecords} />
          </View>

          <Card style={styles.aboutCard}>
            <SectionHeader title="About" />
            <Text style={typography.body}>{dog.bio}</Text>
          </Card>

          <View style={styles.expressInterest}>
            <Button label="Express Interest" onPress={handleExpressInterest} />
          </View>
        </View>
      </ScrollView>

      <AuthPromptSheet
        visible={promptVisible}
        onClose={() => setPromptVisible(false)}
        message={`Sign in to express interest in ${dog.name}.`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  hero: { width: "100%", height: HERO_HEIGHT },
  heroPlaceholder: {
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlaceholderEmoji: { fontSize: 40 },
  body: { paddingHorizontal: spacing.screenPadding, marginTop: spacing.lg },
  subtitle: { marginTop: spacing.xs },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  aboutCard: { marginTop: spacing.lg },
  expressInterest: { marginTop: spacing.xl },
});
