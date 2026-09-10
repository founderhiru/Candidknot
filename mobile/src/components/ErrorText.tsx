import { StyleSheet, Text } from "react-native";
import { colors, spacing } from "@/theme/tokens";

/** Consistent inline validation/error text, used under any input across auth screens. */
export function ErrorText({ children }: { children: string }) {
  return (
    <Text accessibilityRole="alert" style={styles.text}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
