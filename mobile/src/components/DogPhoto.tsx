import { useState } from "react";
import {
  Image,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { Skeleton } from "@/components/Skeleton";
import { colors } from "@/theme/tokens";

/**
 * Single source of truth for "a dog's photo, or a graceful stand-in" —
 * used anywhere a dog's cover photo appears (Discover cards, My Dog
 * cards, Dog Detail hero). Replaces three separately duplicated ad hoc
 * "🐾 in a small box" fallbacks with one consistent, warmer treatment,
 * and adds the loading/error handling none of them had: a pulsing
 * skeleton while a real photo is downloading, and a fallback to the
 * same placeholder if that download ever fails — not just when the URL
 * is absent to begin with.
 *
 * NOTE: this does not solve the underlying content gap — there is no
 * bundled real dog photography in this project (see
 * assets/images/hero-dog-placeholder.jpg, which is a placeholder
 * graphic, not a photo). This component is about handling the null/
 * loading/error cases well with what exists today; swapping in real
 * photos later needs no changes here.
 */
export function DogPhoto({
  uri,
  style,
  emptyLabel,
}: {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  /** Small caption shown under the paw glyph in the empty/error state, e.g. "No photo yet". Omit for a bare glyph (used in dense card grids). */
  emptyLabel?: string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    uri ? "loading" : "error",
  );

  if (!uri || status === "error") {
    return (
      <PhotoPlaceholder style={style}>
        {emptyLabel ? (
          <Text style={styles.placeholderLabel}>{emptyLabel}</Text>
        ) : null}
      </PhotoPlaceholder>
    );
  }

  return (
    <View style={style}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        onLoadEnd={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status === "loading" ? (
        // height is irrelevant here — absoluteFill's inset-0 positioning
        // stretches this to match the Image regardless of Skeleton's own
        // (number-only) height prop.
        <Skeleton height={1} borderRadius={0} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderLabel: { marginTop: 8, color: colors.textMuted, fontSize: 13 },
});
