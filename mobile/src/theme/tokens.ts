// Mobile (Phase mobile-M1) — foundational design tokens only, per the
// approved UX spec's "Design System Recommendations": warm, trustworthy,
// premium, minimal. Carries the CanidKnot identity forward — no new visual
// identity is introduced here, and this file intentionally does not (yet)
// theme any product screens beyond the M1 auth/placeholder set.

export const colors = {
  background: "#FBF8F3",
  surface: "#FFFFFF",
  text: "#1F1B16",
  textMuted: "#6B6459",
  border: "#E7E0D4",
  accent: "#2F6B4F", // CanidKnot brand green — primary CTA color
  accentText: "#FFFFFF",
  danger: "#B3261E",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 16, fontWeight: "400" as const, color: colors.text },
  bodyMuted: {
    fontSize: 14,
    fontWeight: "400" as const,
    color: colors.textMuted,
  },
  label: { fontSize: 13, fontWeight: "600" as const, color: colors.textMuted },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.accentText,
  },
};
