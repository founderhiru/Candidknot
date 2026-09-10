// @polsia:user-owned — server-only admin/founder guard (Phase 2).
// Call at the top of an admin Server Component or route handler. Never
// import into a 'use client' file (see biome.json noRestrictedImports).
import 'server-only';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';

/**
 * Requires the current request to be authenticated AND flagged as a
 * founder/admin (User.isFounder — set only directly in the DB, never via
 * any client-facing API). Throws AuthError otherwise.
 */
export async function requireAdmin() {
  const user = await requireAuthenticatedUser();
  if (!('isFounder' in user) || user.isFounder !== true) {
    throw new AuthError('Admin access required');
  }
  return user;
}
