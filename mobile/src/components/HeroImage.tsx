import type { PropsWithChildren } from "react";
import type { ImageSourcePropType } from "react-native";
import { ImageBackground, StyleSheet, View } from "react-native";
import { colors } from "@/theme/tokens";

interface HeroImageProps {
  /**
   * The full-bleed background image (a static require() — RN resolves
   * these at bundle time, so each screen supplies its own dedicated
   * asset from assets/images/). Currently an illustrated dog scene
   * rather than real photography — see assets/images/README.md for the
   * swap-in path once real photos exist; no code change needed here
   * when that happens, only the asset file.
   */
  source: ImageSourcePropType;
  /** Darkens the lower portion for text legibility over the photo (Splash/Welcome copy sits here). */
  scrim?: boolean;
}

/** Full-bleed photographic hero used on Splash and Welcome. */
export function HeroImage({
  source,
  scrim = true,
  children,
}: PropsWithChildren<HeroImageProps>) {
  return (
    <ImageBackground source={source} style={styles.image} resizeMode="cover">
      {scrim ? <View style={styles.scrim} /> : null}
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  image: { flex: 1, justifyContent: "flex-end" },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayScrim,
    opacity: 0.35,
  },
});
