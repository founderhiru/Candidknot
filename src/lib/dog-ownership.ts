// @polsia:user-owned — shared ownership loader for dog sub-resources
// (photos, health records/documents) added in Phase 4, and for
// /api/dog-profiles/[id] itself. Centralizes the Phase 3 security
// correction: a dog that exists but belongs to someone else must respond
// identically to a dog that doesn't exist — 404, never 401/403 — while the
// ownership check (requireResourceOwner) still runs on every call.
import 'server-only';

import { AuthError, requireResourceOwner } from '@/lib/auth';
import { prisma } from '@/lib/db';

export class NotFoundError extends Error {
  readonly status = 404;
}

/**
 * Loads a DogProfile by id and confirms the current session user owns it.
 * Throws NotFoundError for BOTH a missing dog and a dog owned by someone
 * else (including an unauthenticated caller) — callers must not surface
 * a different status/body for the two cases.
 */
export async function loadOwnedDog(id: string) {
  const dog = await prisma.dogProfile.findUnique({ where: { id } });
  if (!dog) {
    throw new NotFoundError('Dog profile not found');
  }

  try {
    await requireResourceOwner(dog.ownerId);
  } catch (err) {
    if (err instanceof AuthError) {
      throw new NotFoundError('Dog profile not found');
    }
    throw err;
  }

  return dog;
}
