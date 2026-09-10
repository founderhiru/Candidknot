import type { ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";

interface TextFieldProps extends ComponentProps<typeof TextInput> {
  label: string;
  /** Fixed, non-editable prefix — used for the "+91" country code (MVP: hardcoded, see phone.ts). */
  prefix?: string;
}

export function TextField({
  label,
  prefix,
  style,
  ...inputProps
}: TextFieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          {...inputProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  prefix: {
    ...typography.body,
    marginRight: spacing.sm,
    color: colors.textMuted,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing.md,
  },
});
