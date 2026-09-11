// Mobile design system tokens — expanded for the M1/M2 UX refinement pass.
// Additive to the M1 foundation: same CanidKnot green/warm-cream identity,
// no new brand direction. Every screen should theme from here rather than
// hand-rolling colors/spacing/type in its own StyleSheet.

export const colors = {
  // Core brand
  background: "#FBF8F3",
  backgroundAlt: "#F3ECDF", // subtle warm card-on-background contrast
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  text: "#1F1B16",
  textMuted: "#6B6459",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "rgba(255,255,255,0.82)",

  border: "#E7E0D4",
  borderStrong: "#D8CDB9",

  accent: "#2F6B4F", // CanidKnot brand green
  accentDark: "#234F3B",
  accentTint: "#E3EFE8", // green-tinted background for chips/badges
  accentText: "#FFFFFF",

  success: "#2F6B4F",
  successTint: "#E3EFE8",
  warning: "#9C6B14",
  warningTint: "#FBF0DC",
  danger: "#B3261E",
  dangerTint: "#FBEAE9",

  overlayScrim: "rgba(20,15,10,0.55)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
  sheet: 24, // bottom-sheet top corners
} as const;

export const elevation = {
  card: {
    shadowColor: "#1F1B16",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: "#1F1B16",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  sheet: {
    shadowColor: "#1F1B16",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export const typography = {
  display: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    color: colors.text,
    lineHeight: 22,
  },
  bodyMuted: {
    fontSize: 14,
    fontWeight: "400" as const,
    color: colors.textMuted,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.textMuted,
  },
  button: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.accentText,
  },
};

/** Opacity applied to a Pressable while pressed — used everywhere instead of each screen inventing its own feedback. */
export const pressedOpacity = 0.7;
export const disabledOpacity = 0.5;

export const touchTarget = { minHeight: 48, minWidth: 48 };
