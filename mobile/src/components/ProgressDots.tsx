import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/theme/tokens";

/** Small step indicator for multi-step flows (Add Dog onboarding). */
export function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={`dot-${
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length, never reordered.
            i
          }`}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.accent },
  dotDone: { backgroundColor: colors.accent },
});
