import { StyleSheet, View } from "react-native";
import { colors, radius } from "@/theme/tokens";

/**
 * Friendly, tasteful illustration for empty states (no emoji, no
 * paw-print glyph) — a simple seated-dog silhouette built from Views so
 * it needs no new native dependency. Used by EmptyState in place of the
 * previous 🐾 emoji.
 */
export function EmptyStateIllustration({ size = 96 }: { size?: number }) {
  const s = size;
  return (
    <View
      style={[
        styles.backdrop,
        { width: s, height: s, borderRadius: radius.pill },
      ]}
    >
      <View style={styles.dog}>
        {/* body */}
        <View
          style={[
            styles.body,
            { width: s * 0.5, height: s * 0.4, borderRadius: s * 0.2 },
          ]}
        />
        {/* head */}
        <View
          style={[
            styles.head,
            { width: s * 0.3, height: s * 0.3, borderRadius: radius.pill },
          ]}
        />
        {/* ears */}
        <View
          style={[
            styles.ear,
            styles.earLeft,
            { width: s * 0.14, height: s * 0.22 },
          ]}
        />
        <View
          style={[
            styles.ear,
            styles.earRight,
            { width: s * 0.14, height: s * 0.22 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dog: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: "18%",
  },
  body: { backgroundColor: colors.accent, opacity: 0.85 },
  head: {
    backgroundColor: colors.accent,
    marginBottom: -8,
    zIndex: 2,
  },
  ear: {
    position: "absolute",
    backgroundColor: colors.accentDark,
    borderRadius: 999,
    top: "16%",
  },
  earLeft: { left: "30%", transform: [{ rotate: "-14deg" }] },
  earRight: { right: "30%", transform: [{ rotate: "14deg" }] },
});
