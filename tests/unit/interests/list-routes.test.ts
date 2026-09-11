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
  prisma: { interest: { findMany: findManyMock } },
}));

const USER_A = { id: 'user_a' };

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  findManyMock.mockReset();
});

describe('GET /api/interests/received', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/interests/received/route');

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('scopes the query to dogs the caller owns — never a client-supplied filter', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([
      {
        id: 'interest_1',
        status: 'pending',
        createdAt: new Date('2026-09-11T00:00:00.000Z'),
        targetDogId: 'dog_1',
        sender: { name: 'Priya' },
        targetDog: { name: 'Bruno' },
      },
    ]);
    const { GET } = await import('@/app/api/interests/received/route');

    const res = await GET();

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { targetDog: { ownerId: USER_A.id } } }),
    );
    const body = await res.json();
    expect(body.items[0]).toMatchObject({ senderName: 'Priya', targetDogName: 'Bruno' });
  });
});

describe('GET /api/interests/sent', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/interests/sent/route');

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('scopes the query to interests the caller sent', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([
      {
        id: 'interest_1',
        status: 'pending',
        createdAt: new Date('2026-09-11T00:00:00.000Z'),
        targetDogId: 'dog_1',
        targetDog: { name: 'Bruno' },
      },
    ]);
    const { GET } = await import('@/app/api/interests/sent/route');

    const res = await GET();

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { senderId: USER_A.id } }),
    );
  });
});
