import { Slot } from "expo-router";

/**
 * Guest-first navigation (see docs/guest-first-flow if this grows): the
 * (app) tab group itself is NOT auth-gated — Discover (and the Matches
 * placeholder) must be reachable without a session. Authentication is
 * enforced per-action/per-screen instead:
 *   - My Dog / Profile tab roots show a guest state + sign-in prompt when
 *     there's no session (see their own index.tsx files).
 *   - Add Dog / Edit Dog / Edit Profile guard themselves directly (see
 *     RequireAuthScreen) in case of a direct deep link.
 *   - Discover's Express Interest action gates itself via useRequireAuth.
 * This file used to redirect the whole group to /welcome on no session —
 * removed deliberately; see git history if that's ever needed again.
 */
export default function AppLayout() {
  return <Slot />;
}
