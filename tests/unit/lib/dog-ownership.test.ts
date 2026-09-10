// @vitest-environment node
//
// loadOwnedDog() is the single ownership gate shared by
// /api/dog-profiles/[id] and every Phase 4 sub-resource route (photos,
// health-records, documents). It must:
//   - 404 (NotFoundError) when the dog doesn't exist, without ever calling
//     the ownership check
//   - still ACTUALLY run the ownership check (requireResourceOwner) when
//     the dog exists
//   - 404 (never surface a 401/403) when the dog exists but belongs to
//     someone else, or the caller is unauthenticated — both funnel through
//     requireResourceOwner throwing AuthError, which this helper converts
//   - return the dog row unchanged when the caller is the actual owner
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

class FakeAuthError extends Error {
  readonly status = 401;
}
const requireResourceOwnerMock = vi.fn();
vi.mock('@/lib/auth', () => ({
  AuthError: FakeAuthError,
  requireResourceOwner: requireResourceOwnerMock,
}));

const findUniqueMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { dogProfile: { findUnique: findUniqueMock } },
}));

const USER_A = { id: 'user_a', email: 'a@example.com' };

const DOG_OWNED_BY_A = {
  id: 'dog_1',
  ownerId: USER_A.id,
  name: 'Rex',
};

beforeEach(() => {
  requireResourceOwnerMock.mockReset();
  findUniqueMock.mockReset();
});

describe('loadOwnedDog', () => {
  it('throws NotFoundError for a missing dog, without calling requireResourceOwner', async () => {
    findUniqueMock.mockResolvedValue(null);
    const { loadOwnedDog, NotFoundError } = await import('@/lib/dog-ownership');

    await expect(loadOwnedDog('missing')).rejects.toBeInstanceOf(NotFoundError);
    expect(requireResourceOwnerMock).not.toHaveBeenCalled();
  });

  it('throws NotFoundError (not AuthError) for a dog owned by someone else, while still calling requireResourceOwner', async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockRejectedValue(new FakeAuthError('Not authorized'));
    const { loadOwnedDog, NotFoundError } = await import('@/lib/dog-ownership');

    await expect(loadOwnedDog('dog_1')).rejects.toBeInstanceOf(NotFoundError);
    expect(requireResourceOwnerMock).toHaveBeenCalledWith(USER_A.id);
  });

  it('throws NotFoundError (not AuthError) for an unauthenticated caller — same shape as ownership mismatch', async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { loadOwnedDog, NotFoundError } = await import('@/lib/dog-ownership');

    await expect(loadOwnedDog('dog_1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('re-throws a non-AuthError failure unchanged (does not swallow real errors as 404)', async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    const dbError = new Error('connection lost');
    requireResourceOwnerMock.mockRejectedValue(dbError);
    const { loadOwnedDog } = await import('@/lib/dog-ownership');

    await expect(loadOwnedDog('dog_1')).rejects.toBe(dbError);
  });

  it('returns the dog row when the caller is the actual owner', async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockResolvedValue(USER_A);
    const { loadOwnedDog } = await import('@/lib/dog-ownership');

    await expect(loadOwnedDog('dog_1')).resolves.toEqual(DOG_OWNED_BY_A);
  });
});
