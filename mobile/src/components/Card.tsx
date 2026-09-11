import type { PropsWithChildren } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, elevation, radius, spacing } from "@/theme/tokens";

interface CardProps {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
}

/** The one elevated-surface primitive — replaces ad-hoc bordered Views across screens. */
export function Card({
  children,
  style,
  padded = true,
  elevated = true,
}: PropsWithChildren<CardProps>) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        elevated && elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  padded: {
    padding: spacing.cardPadding,
  },
});
