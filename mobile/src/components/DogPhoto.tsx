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
import { getDemoPhotoForKey } from "@/lib/demo-photos";
import { colors } from "@/theme/tokens";

// Final fallback cover — used only when there's no real photo AND no
// demoKey to deterministically pick a demo photo from (e.g. a brand-new
// "Add Dog" preview slot before the dog even has a slug yet). A
// recognizable illustrated dog, same as the demo-dogs set (see
// assets/images/README.md) — resolved via require() so Metro bundles it
// locally and nothing here depends on network access.
const GENERIC_PLACEHOLDER = require("../../assets/images/dog-cover-placeholder.jpg");

/**
 * A photo url is only ever worth attempting to load if it's an absolute
 * http(s) URL — which is exactly what the backend's publicUrlFor() always
 * produces (see src/lib/storage.ts) when correctly configured. Guards
 * against a misconfigured R2_PUBLIC_HOSTNAME (unset in Render's
 * dashboard) producing a malformed url like "https:///dogs/..." — some
 * platforms never fire an Image's onError for a URI that broken, which
 * would otherwise leave this component stuck silently rendering nothing
 * instead of falling back. Checking up front means the fallback doesn't
 * depend on that callback firing at all — this is deliberate, not just
 * relying on onError (see Phase 6 of the image-implementation notes).
 */
function isLoadableUri(uri: string): boolean {
  return /^https?:\/\/.+/.test(uri);
}

/**
 * Single source of truth for "a dog's photo, or a graceful stand-in" —
 * used anywhere a dog's cover photo appears (Discover cards, My Dog
 * cards, Dog Detail hero, owner profile previews). Photo priority:
 *
 *   1. A real uploaded photo (`uri`), if present and safely loadable.
 *   2. A bundled, recognizable illustrated demo dog, deterministically
 *      chosen from `demoKey` (pass the dog's `slug` — stable for that
 *      dog's whole lifetime, present on both OwnedDogProfileItem and the
 *      public DogProfileItem) — the same dog always shows the same demo
 *      photo, every time, with no storage needed for that assignment.
 *   3. A single generic illustrated placeholder, only when neither of
 *      the above applies at all (no uri AND no demoKey).
 *
 * This ordering (and rendering the fallback synchronously whenever
 * `uri` is absent or fails validation, rather than waiting on a load
 * attempt) is what makes tiers 2/3 render immediately for guests
 * browsing demo dogs — no login, no R2, no network round trip, and no
 * dependence on a remote image ever actually erroring out.
 *
 * Handles the loading/error cases throughout: a pulsing skeleton while a
 * real photo is downloading, and a fallback to tier 2/3 if that download
 * ever fails or the url is malformed. Every tier renders through the
 * same <Image resizeMode="cover"> treatment, so rounded corners (set by
 * the caller via `style` + `overflow: hidden`) apply consistently, and
 * every tier gives the Image a non-zero size because `style` always
 * comes from the caller's own fixed-dimension layout (see PublicDogCard,
 * DogCard, and the Dog Detail heroes for the actual width/height).
 */
export function DogPhoto({
  uri,
  demoKey,
  style,
  emptyLabel,
}: {
  uri: string | null | undefined;
  /** Stable per-dog key (pass the dog's `slug`) used to deterministically pick a bundled demo photo when there's no real uri. Omit only when no such key exists yet. */
  demoKey?: string;
  style?: StyleProp<ViewStyle>;
  /** Small caption chip shown over the fallback image, e.g. "No photo yet". Omit for a bare fallback (used in dense card grids, and always omitted for public Discover cards). */
  emptyLabel?: string;
}) {
  const canAttemptLoad = !!uri && isLoadableUri(uri);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    canAttemptLoad ? "loading" : "error",
  );

  const showFallback = !canAttemptLoad || status === "error";
  const fallbackSource = demoKey
    ? getDemoPhotoForKey(demoKey)
    : GENERIC_PLACEHOLDER;

  return (
    <View style={style}>
      <Image
        source={showFallback ? fallbackSource : { uri: uri as string }}
        // iOS shows this immediately while the real photo above is still
        // downloading, so there's never a blank frame during the network
        // fetch (Android ignores defaultSource; the Skeleton below covers
        // that case instead). Harmless — and never shown at all — in the
        // showFallback branch, since source and defaultSource are then
        // the same image.
        defaultSource={fallbackSource}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoadEnd={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {!showFallback && status === "loading" ? (
        // height is irrelevant here — absoluteFill's inset-0 positioning
        // stretches this to match the Image regardless of Skeleton's own
        // (number-only) height prop.
        <Skeleton height={1} borderRadius={0} style={StyleSheet.absoluteFill} />
      ) : null}
      {showFallback && emptyLabel ? (
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
