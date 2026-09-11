import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { HealthBadge, VerifiedBadge } from "@/components/Badge";
import type { OwnedDogProfileItem } from "@/lib/contracts";
import {
  colors,
  elevation,
  pressedOpacity,
  radius,
  spacing,
  typography,
} from "@/theme/tokens";

export function DogCard({
  dog,
  onPress,
  primary,
}: {
  dog: OwnedDogProfileItem;
  onPress: () => void;
  /** Visually distinguishes the first/primary dog when an owner has more than one. */
  primary?: boolean;
}) {
  const cover = dog.photos.find((p) => p.position === 0) ?? dog.photos[0];
  const hasHealthRecords =
    Array.isArray(dog.healthRecords) && dog.healthRecords.length > 0;

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
      {cover ? (
        <Image source={{ uri: cover.url }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderEmoji}>🐾</Text>
          <Text style={typography.bodyMuted}>No photo yet</Text>
        </View>
      )}

      {primary ? (
        <View style={styles.primaryBadge}>
          <Text style={styles.primaryBadgeText}>★ Primary</Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <Text style={typography.sectionTitle}>{dog.name}</Text>
        <Text style={[typography.bodyMuted, styles.meta]}>
          {dog.breed} · {dog.ageYears} {dog.ageYears === 1 ? "yr" : "yrs"} ·{" "}
          {dog.city}
        </Text>
        <View style={styles.badgeRow}>
          {dog.isVerified ? <VerifiedBadge /> : null}
          <HealthBadge hasRecords={hasHealthRecords} />
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
  photo: { width: "100%", height: 220 },
  photoPlaceholder: {
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoPlaceholderEmoji: { fontSize: 32 },
  primaryBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  primaryBadgeText: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: "700",
  },
  info: { padding: spacing.cardPadding },
  meta: { marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
});
