import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HealthBadge, VerifiedBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DogPhoto } from "@/components/DogPhoto";
import { ErrorText } from "@/components/ErrorText";
import { PhotoGrid } from "@/components/PhotoGrid";
import { Screen } from "@/components/Screen";
import type { OwnedDogProfileItem } from "@/lib/contracts";
import { getDog } from "@/lib/dog-api";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const HERO_HEIGHT = 340;

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dog, setDog] = useState<OwnedDogProfileItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getDog(id);
      setDog(result);
    } catch {
      setError("Couldn't load this dog's profile.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!dog && !error) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error || !dog) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ErrorText>{error ?? "Something went wrong."}</ErrorText>
          <View style={styles.retryButton}>
            <Button label="Retry" onPress={load} variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  const cover = dog.photos.find((p) => p.position === 0) ?? dog.photos[0];
  const hasHealthRecords = dog.healthRecords.length > 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={styles.heroWrap}>
          <DogPhoto
            uri={cover?.url}
            demoKey={dog.slug}
            style={styles.hero}
            emptyLabel="No photo yet"
          />
          <SafeAreaView edges={["top"]} style={styles.heroControls}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.iconGlyph}>←</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/(app)/(tabs)/my-dog/${dog.id}/edit`)}
              accessibilityRole="button"
              accessibilityLabel="Edit"
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.iconGlyph}>✎</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={typography.title}>{dog.name}</Text>
          </View>
          <Text style={[typography.bodyMuted, styles.subtitle]}>
            {dog.breed} · {dog.city}
          </Text>

          <View style={styles.badgeRow}>
            {dog.isVerified ? <VerifiedBadge /> : null}
            <HealthBadge hasRecords={hasHealthRecords} />
          </View>

          <Card style={styles.statCard}>
            <View style={styles.statItem}>
              <Text style={typography.sectionTitle}>{dog.ageYears}</Text>
              <Text style={typography.caption}>
                {dog.ageYears === 1 ? "Year" : "Years"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={typography.sectionTitle}>{dog.sex}</Text>
              <Text style={typography.caption}>Sex</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={typography.sectionTitle} numberOfLines={1}>
                {dog.city}
              </Text>
              <Text style={typography.caption}>Location</Text>
            </View>
          </Card>

          <Text style={[typography.sectionTitle, styles.sectionSpacing]}>
            About {dog.name}
          </Text>
          <Text style={[typography.body, styles.bio]}>{dog.bio}</Text>

          <View style={styles.actionRow}>
            <View style={styles.actionButton}>
              <Button
                label="Edit Details"
                onPress={() =>
                  router.push(`/(app)/(tabs)/my-dog/${dog.id}/edit`)
                }
                variant="secondary"
              />
            </View>
            <View style={styles.actionButton}>
              <Button
                label="Health Passport"
                onPress={() =>
                  router.push(`/(app)/(tabs)/my-dog/${dog.id}/health`)
                }
                variant="secondary"
              />
            </View>
          </View>

          <View style={styles.photos}>
            <Text style={typography.sectionTitle}>Photos</Text>
            <View style={styles.photosSpacing}>
              <PhotoGrid
                dogId={dog.id}
                photos={dog.photos}
                onPhotosChange={(photos) => setDog({ ...dog, photos })}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  scroll: { paddingBottom: spacing.xxl },
  heroWrap: { width: "100%", height: HERO_HEIGHT },
  hero: { width: "100%", height: "100%" },
  heroControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,15,10,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  iconGlyph: { color: colors.textOnDark, fontSize: 18, fontWeight: "700" },
  body: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    marginTop: -radius.xl,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  subtitle: { marginTop: spacing.xs },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  sectionSpacing: { marginTop: spacing.xl },
  bio: { marginTop: spacing.sm },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  actionButton: { flex: 1 },
  photos: { marginTop: spacing.xl },
  photosSpacing: { marginTop: spacing.md },
});
