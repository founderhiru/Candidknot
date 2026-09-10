// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

class FakeAuthError extends Error {
  readonly status = 401;
}
const requireAuthenticatedUserMock = vi.fn();
vi.mock('@/lib/auth', () => ({
  AuthError: FakeAuthError,
  requireAuthenticatedUser: requireAuthenticatedUserMock,
}));

const findManyMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { dogProfile: { findMany: findManyMock } },
}));

const USER_A = { id: 'user_a', email: 'a@example.com' };

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  findManyMock.mockReset();
});

describe('GET /api/dog-profiles/mine', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/dog-profiles/mine/route');

    const res = await GET();

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("queries only the authenticated user's own dogs", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/api/dog-profiles/mine/route');

    const res = await GET();

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: USER_A.id } }),
    );
  });
});
