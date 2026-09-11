import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { colors, radius, spacing, typography } from "@/theme/tokens";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly, visually-framed empty state — replaces plain "no items" text across screens. */
export function EmptyState({
  emoji = "🐾",
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={typography.sectionTitle}>{title}</Text>
      <Text style={[typography.bodyMuted, styles.message]}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emoji: { fontSize: 40 },
  message: {
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  action: { alignSelf: "stretch" },
});
