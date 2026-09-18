import { useState } from "react";
import {
  Image,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Skeleton } from "@/components/Skeleton";
import { colors } from "@/theme/tokens";

// Bundled fallback cover — used whenever a dog has no uploaded photo, or
// a real photo URL fails to load. Currently stylized warm placeholder
// artwork rather than a real photo (see assets/images/README.md for the
// swap-in path); resolved via require() so Metro bundles it locally and
// nothing here depends on network access.
const PLACEHOLDER_PHOTO = require("../../assets/images/dog-cover-placeholder.jpg");

/**
 * Single source of truth for "a dog's photo, or a graceful stand-in" —
 * used anywhere a dog's cover photo appears (Discover cards, My Dog
 * cards, Dog Detail hero). Handles the loading/error cases: a pulsing
 * skeleton while a real photo is downloading, and a fallback to the
 * same bundled placeholder image if that download ever fails — not just
 * when the URL is absent to begin with. Both the real photo and the
 * placeholder render through the same <Image resizeMode="cover">
 * treatment, so rounded corners (set by the caller via `style` +
 * `overflow: hidden`) apply consistently either way.
 */
export function DogPhoto({
  uri,
  style,
  emptyLabel,
}: {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  /** Small caption chip shown over the placeholder image, e.g. "No photo yet". Omit for a bare placeholder (used in dense card grids). */
  emptyLabel?: string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    uri ? "loading" : "error",
  );

  const showPlaceholder = !uri || status === "error";

  return (
    <View style={style}>
      <Image
        source={showPlaceholder ? PLACEHOLDER_PHOTO : { uri: uri as string }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoadEnd={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {!showPlaceholder && status === "loading" ? (
        // height is irrelevant here — absoluteFill's inset-0 positioning
        // stretches this to match the Image regardless of Skeleton's own
        // (number-only) height prop.
        <Skeleton height={1} borderRadius={0} style={StyleSheet.absoluteFill} />
      ) : null}
      {showPlaceholder && emptyLabel ? (
        <View style={styles.labelChip}>
          <Text style={styles.labelChipText}>{emptyLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelChip: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    backgroundColor: "rgba(20,15,10,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  labelChipText: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: "600",
  },
});
