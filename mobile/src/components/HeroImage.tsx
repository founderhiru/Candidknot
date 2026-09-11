import type { PropsWithChildren } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { colors } from "@/theme/tokens";

// TEMPORARY DEV ASSET — see assets/images/README.md for exactly what to
// replace this with before shipping. Referenced via a static require() (RN
// resolves image requires at bundle time), so swapping the file in place
// needs no code change here.
const HERO_IMAGE = require("../../assets/images/hero-dog-placeholder.jpg");

interface HeroImageProps {
  /** Darkens the lower portion for text legibility over the photo (Splash/Welcome copy sits here). */
  scrim?: boolean;
}

/** Full-bleed photographic hero used on Splash and Welcome. */
export function HeroImage({
  scrim = true,
  children,
}: PropsWithChildren<HeroImageProps>) {
  return (
    <ImageBackground
      source={HERO_IMAGE}
      style={styles.image}
      resizeMode="cover"
    >
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
