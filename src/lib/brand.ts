// @polsia:user-owned — brand identity. Edit freely. `site.ts` re-exports
// siteName/siteDescription; `manifest.ts` + `opengraph-image.tsx` read `brandVisual`.

export const siteName = 'CanidKnot';
export const siteDescription =
  'Verified, health-first breeding connections for India’s responsible dog owners.';

// PWA + social-share colors. HEX only (the oklch() tokens in globals.css aren't
// readable here) — set to match your brand seed.
export const brandVisual = {
  /** PWA browser-UI / status-bar color. */
  themeColor: '#b85c2e',
  /** PWA splash + install background. */
  backgroundColor: '#fbf8f2',
  /** Social-share (OG/Twitter) image. */
  og: {
    background: '#2a211b',
    foreground: '#fbf8f2',
    /** Second line under the site name; '' hides it. */
    tagline: 'Verified, health-first breeding connections for India’s responsible dog owners.',
  },
} as const;
