import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { OwnedDogProfileItem } from "@/lib/contracts";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export function DogCard({
  dog,
  onPress,
}: {
  dog: OwnedDogProfileItem;
  onPress: () => void;
}) {
  const cover = dog.photos.find((p) => p.position === 0) ?? dog.photos[0];

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      {cover ? (
        <Image source={{ uri: cover.url }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderText}>No photo yet</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={typography.title}>{dog.name}</Text>
        <Text style={typography.bodyMuted}>
          {dog.breed} · {dog.sex} · {dog.ageYears}{" "}
          {dog.ageYears === 1 ? "year" : "years"}
        </Text>
        {dog.isVerified ? (
          <Text style={styles.verified}>✓ Verified</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  photo: { width: "100%", height: 180 },
  photoPlaceholder: {
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: { ...typography.bodyMuted },
  info: { padding: spacing.md },
  verified: {
    ...typography.label,
    color: colors.accent,
    marginTop: spacing.xs,
  },
});
