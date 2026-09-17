import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { colors, radius } from "@/theme/tokens";

/**
 * Elegant stand-in for a real photo (dog cover photo, hero banner, owner
 * avatar backdrop) wherever no photo has been uploaded yet. Deliberately
 * NOT an emoji or paw-print glyph — a soft two-tone warm wash with a
 * minimal geometric dog-head mark, built entirely from Views so it needs
 * no new native dependency (no SVG/gradient library in this project).
 *
 * Swap-in path: once real photography exists, this is only ever rendered
 * as a fallback (see DogPhoto/HeroImage) — no caller needs to change.
 */
export function PhotoPlaceholder({
  style,
  tone = "warm",
  children,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** "warm" (cream/tan, for cards) or "deep" (dark green, for full-bleed hero). */
  tone?: "warm" | "deep";
}>) {
  const isDeep = tone === "deep";
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: isDeep ? colors.accentDark : colors.backgroundAlt },
        style,
      ]}
    >
      <View
        style={[
          styles.wash,
          {
            backgroundColor: isDeep ? colors.accent : colors.accentTint,
            opacity: isDeep ? 0.55 : 0.9,
          },
        ]}
      />
      <View style={styles.mark}>
        <View
          style={[
            styles.markCircle,
            {
              backgroundColor: isDeep
                ? "rgba(255,255,255,0.16)"
                : colors.surface,
            },
          ]}
        >
          {/* Minimal geometric dog-head mark: two ear shapes + a head circle. */}
          <View
            style={[
              styles.ear,
              styles.earLeft,
              { backgroundColor: isDeep ? colors.textOnDark : colors.accent },
            ]}
          />
          <View
            style={[
              styles.ear,
              styles.earRight,
              { backgroundColor: isDeep ? colors.textOnDark : colors.accent },
            ]}
          />
          <View
            style={[
              styles.head,
              { backgroundColor: isDeep ? colors.textOnDark : colors.accent },
            ]}
          />
        </View>
      </View>
      {children}
    </View>
  );
}

const MARK_SIZE = 56;

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  mark: { alignItems: "center", justifyContent: "center" },
  markCircle: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  head: {
    width: MARK_SIZE * 0.46,
    height: MARK_SIZE * 0.46,
    borderRadius: radius.pill,
    opacity: 0.9,
  },
  ear: {
    position: "absolute",
    width: MARK_SIZE * 0.24,
    height: MARK_SIZE * 0.34,
    borderRadius: radius.sm,
    opacity: 0.9,
  },
  earLeft: {
    top: MARK_SIZE * 0.06,
    left: MARK_SIZE * 0.14,
    transform: [{ rotate: "-18deg" }],
  },
  earRight: {
    top: MARK_SIZE * 0.06,
    right: MARK_SIZE * 0.14,
    transform: [{ rotate: "18deg" }],
  },
});
