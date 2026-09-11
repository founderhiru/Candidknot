import { useEffect, useRef } from "react";
import {
  Animated,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { colors, radius } from "@/theme/tokens";

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A gently pulsing placeholder block — used instead of a bare spinner so loading feels intentional. */
export function Skeleton({
  width = "100%",
  height,
  borderRadius = radius.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius, opacity }, style]}
    />
  );
}

/** A dog-card-shaped skeleton for My Dog / Discover-style lists. */
export function DogCardSkeleton() {
  return (
    <Animated.View style={styles.cardSkeleton}>
      <Skeleton height={180} borderRadius={radius.lg} />
      <Skeleton height={18} width="60%" style={styles.gapTop} />
      <Skeleton height={14} width="40%" style={styles.gapSm} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.borderStrong },
  cardSkeleton: { marginBottom: 16 },
  gapTop: { marginTop: 12 },
  gapSm: { marginTop: 6 },
});
