import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import type { HealthRecordItem } from "@/lib/health-contracts";
import { HEALTH_RECORD_TYPE_LABELS } from "@/lib/health-form";
import {
  colors,
  elevation,
  pressedOpacity,
  radius,
  spacing,
  typography,
} from "@/theme/tokens";

const TYPE_TONE: Record<
  HealthRecordItem["type"],
  "success" | "neutral" | "warning"
> = {
  vaccination: "success",
  vetVisit: "neutral",
  other: "warning",
};

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HealthRecordCard({
  record,
  onPress,
}: {
  record: HealthRecordItem;
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
      <View style={styles.header}>
        <Badge
          label={HEALTH_RECORD_TYPE_LABELS[record.type]}
          tone={TYPE_TONE[record.type]}
        />
        <Text style={typography.caption}>{formatDate(record.occurredOn)}</Text>
      </View>
      <Text style={[typography.sectionTitle, styles.title]}>
        {record.title}
      </Text>
      {record.vetName ? (
        <Text style={typography.bodyMuted}>Vet: {record.vetName}</Text>
      ) : null}
      {record.documents.length > 0 ? (
        <Text style={[typography.caption, styles.docCount]}>
          📎 {record.documents.length}{" "}
          {record.documents.length === 1 ? "document" : "documents"}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { marginTop: spacing.sm },
  docCount: { marginTop: spacing.xs },
});
