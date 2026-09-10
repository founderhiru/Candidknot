import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";

interface ChipSelectProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

/** Thumb-friendly single-select for a small, fixed set of options (city, sex). */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
}: ChipSelectProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.xs },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: { ...typography.body, fontSize: 14 },
  chipTextSelected: { color: colors.accentText, fontWeight: "600" },
});
