import { StyleSheet, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { spacing, typography } from "@/theme/tokens";

/**
 * Used by the M1 tab roots (My Dog, Discover, Matches) to prove navigation
 * works, per the M1 scope ("navigation shell and placeholder/root screens
 * required to prove navigation works" — not the real screens, which are
 * later phases).
 */
export function PlaceholderScreen({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, marginTop: spacing.xl },
  note: { ...typography.bodyMuted, marginTop: spacing.sm },
});
