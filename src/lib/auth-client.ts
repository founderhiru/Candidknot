// @polsia:user-owned — client-side better-auth instance (Phase 2).
// Import this from 'use client' components only. Server code uses
// @/lib/auth directly (getAuthenticatedUser/requireAuthenticatedUser).
'use client';

import { magicLinkClient, phoneNumberClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), phoneNumberClient()],
});

// Re-exported for the exact seam already referenced in site-nav.tsx:
//   import { useSession } from '@/lib/auth-client';
export const { useSession, signOut, signIn, phoneNumber } = authClient;
