// @polsia:user-owned — app navigation rendered by SiteNav/SiteFooter and read by
// the sitemap. Edit it as pages are added or removed.
// This list is a convenience, not module registration.

export type NavGroup = 'primary' | 'secondary' | 'footer';

export interface NavItem {
  /** Visible link text. */
  label: string;
  /** App route, e.g. '/' or '/dashboard'. */
  href: string;
  /** Where it renders: top-nav 'primary'/'secondary', or 'footer'. */
  group: NavGroup;
  /** Group `primary` items into a dropdown: items sharing a `menu` value collapse
   *  into one "<menu> ⌄" top-bar slot (e.g. `menu: 'Resources'` on Blog/Docs/
   *  Changelog). Keeps the bar short. Ignored for 'secondary'/'footer'. */
  menu?: string;
  /** When true, render only if a session exists (see site-nav.tsx). */
  requiresAuth?: boolean;
  /** Sort key within a group (ascending); unordered items fall to the end. */
  order?: number;
}

// Keep the bar short: ~3-5 primary slots, group the tail with `menu`, push the
// rest to 'footer' (SiteNav overflows extras into a "More" dropdown). Example:
//   { label: 'Pricing', href: '/pricing', group: 'primary' },
//   { label: 'Blog',    href: '/blog',    group: 'primary', menu: 'Resources' },
//   { label: 'Docs',    href: '/docs',    group: 'primary', menu: 'Resources' },
//   { label: 'Sign in', href: '/login',   group: 'secondary' },
export const navItems: NavItem[] = [
  { label: 'Features', href: '/#features', group: 'primary', order: 1 },
  { label: 'How it works', href: '/#how-it-works', group: 'primary', order: 2 },
  { label: 'Discover', href: '/discover', group: 'primary', order: 3 },
  // 'Join the network' (mailto) removed temporarily: no real contact address
  // exists yet. Re-add once a real email/signup flow is wired up.
  // Phase 3 — only rendered once a session exists (see requiresAuth handling
  // in site-nav.tsx). Sit in 'secondary' alongside the sign-in/out control.
  { label: 'Your dogs', href: '/dogs', group: 'secondary', requiresAuth: true, order: 1 },
  { label: 'Your profile', href: '/profile', group: 'secondary', requiresAuth: true, order: 2 },
  { label: 'Welfare-first', href: '/#welfare', group: 'footer', order: 1 },
  {
    label: 'Veterinary partners',
    href: '/#partners',
    group: 'footer',
    order: 2,
  },
];
