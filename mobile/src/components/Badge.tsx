import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";

type Tone = "success" | "warning" | "neutral";

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successTint, fg: colors.success },
  warning: { bg: colors.warningTint, fg: colors.warning },
  neutral: { bg: colors.accentTint, fg: colors.accentDark },
};

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  const { bg, fg } = TONE_STYLES[tone];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Dog is verified by Kinro — used on My Dog cards and Dog Detail. */
export function VerifiedBadge() {
  return <Badge label="✓ Verified" tone="success" />;
}

/** Dog has at least one health record on file — a signal, not the full passport. */
export function HealthBadge({ hasRecords }: { hasRecords: boolean }) {
  return hasRecords ? <Badge label="Health ✓" tone="success" /> : null;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: { ...typography.caption, fontWeight: "700" },
});
