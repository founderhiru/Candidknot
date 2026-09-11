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
  prisma: { conversation: { findMany: findManyMock } },
}));

const USER_A = { id: 'user_a' };
const USER_B = { id: 'user_b' };

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  findManyMock.mockReset();
});

describe('GET /api/conversations', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/conversations/route');

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("scopes the query to the caller's active-Match conversations only", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/api/conversations/route');

    await GET();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          match: { status: 'active', OR: [{ senderId: USER_A.id }, { receiverId: USER_A.id }] },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });

  it('returns the other participant and last message for each conversation', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([
      {
        id: 'conv_1',
        matchId: 'match_1',
        updatedAt: new Date('2026-09-11T00:00:00.000Z'),
        match: {
          senderId: USER_A.id,
          receiverId: USER_B.id,
          sender: { name: 'Me' },
          receiver: { name: 'Priya' },
          targetDogId: 'dog_1',
          targetDog: { name: 'Bruno' },
        },
        messages: [{ body: 'Hi there', createdAt: new Date('2026-09-11T00:05:00.000Z') }],
      },
    ]);
    const { GET } = await import('@/app/api/conversations/route');

    const res = await GET();
    const body = await res.json();

    expect(body.items[0]).toMatchObject({
      otherUserName: 'Priya',
      lastMessageBody: 'Hi there',
    });
  });
});
