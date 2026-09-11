import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { HealthBadge, VerifiedBadge } from "@/components/Badge";
import type { DogProfileItem } from "@/lib/discover-contracts";
import {
  colors,
  elevation,
  pressedOpacity,
  radius,
  spacing,
  typography,
} from "@/theme/tokens";

/** Discover feed card for a PUBLIC dog profile — cover photo + badges only, no owner actions. */
export function PublicDogCard({
  dog,
  onPress,
}: {
  dog: DogProfileItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        elevation.card,
        pressed && { opacity: pressedOpacity },
      ]}
      accessibilityRole="button"
    >
      {dog.coverPhotoUrl ? (
        <Image source={{ uri: dog.coverPhotoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderEmoji}>🐾</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={typography.sectionTitle}>{dog.name}</Text>
        <Text style={[typography.bodyMuted, styles.meta]}>
          {dog.breed} · {dog.ageYears} {dog.ageYears === 1 ? "yr" : "yrs"} ·{" "}
          {dog.city}
          {dog.distanceKm != null ? ` · ${dog.distanceKm} km` : ""}
        </Text>
        <View style={styles.badgeRow}>
          {dog.isVerified ? <VerifiedBadge /> : null}
          <HealthBadge hasRecords={dog.hasHealthRecords} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  photo: { width: "100%", height: 200 },
  photoPlaceholder: {
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderEmoji: { fontSize: 32 },
  info: { padding: spacing.cardPadding },
  meta: { marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
});
