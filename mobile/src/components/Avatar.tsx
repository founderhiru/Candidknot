import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/theme/tokens";

/**
 * There is no owner profile-photo upload capability on the backend today —
 * better-auth's updateUser only accepts an `image` URL string (no upload
 * endpoint produces one), unlike dogs, which have a real Phase 4 R2 upload
 * route. Rather than fake a picker that has nowhere to send the file, this
 * renders an initials avatar. A real photo capability is a future backend
 * addition (a user-avatar upload endpoint mirroring the dog-photos one),
 * not something this phase invents.
 */
export function Avatar({
  name,
  size = 64,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius.pill },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: colors.accentText, fontWeight: "700" },
});
