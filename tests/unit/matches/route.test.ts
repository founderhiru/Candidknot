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
  prisma: { match: { findMany: findManyMock } },
}));

const USER_A = { id: 'user_a' };
const USER_B = { id: 'user_b' };

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  findManyMock.mockReset();
});

describe('GET /api/matches', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/matches/route');

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('scopes the query to matches where the caller is sender OR receiver', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/api/matches/route');

    await GET();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ senderId: USER_A.id }, { receiverId: USER_A.id }] },
      }),
    );
  });

  it('always shows the OTHER party, whichever side the caller was on', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([
      {
        id: 'match_1',
        senderId: USER_A.id,
        receiverId: USER_B.id,
        sender: { name: 'Me' },
        receiver: { name: 'The Other Owner' },
        targetDogId: 'dog_1',
        targetDog: { name: 'Bruno' },
        status: 'active',
        createdAt: new Date('2026-09-11T00:00:00.000Z'),
        conversation: { id: 'conv_1' },
      },
    ]);
    const { GET } = await import('@/app/api/matches/route');

    const res = await GET();
    const body = await res.json();

    expect(body.items[0].otherUserName).toBe('The Other Owner');
    expect(body.items[0].conversationId).toBe('conv_1');
  });
});
