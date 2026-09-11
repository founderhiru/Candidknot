import type { ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";

interface TextAreaProps extends ComponentProps<typeof TextInput> {
  label: string;
}

/** The shared multiline field — was duplicated per-screen in three places; now one definition. */
export function TextArea({ label, style, ...inputProps }: TextAreaProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.xs },
  input: {
    ...typography.body,
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
