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

const loadOwnedConversationMock = vi.fn();
class FakeConversationAccessError extends Error {
  readonly status = 404;
}
vi.mock('@/lib/conversation-ownership', () => ({
  ConversationAccessError: FakeConversationAccessError,
  loadOwnedConversation: loadOwnedConversationMock,
}));

const messageFindManyMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { message: { findMany: messageFindManyMock } },
}));

const USER_A = { id: 'user_a' };
const USER_B = { id: 'user_b' };

function ownedConversation() {
  return {
    id: 'conv_1',
    matchId: 'match_1',
    match: {
      senderId: USER_A.id,
      receiverId: USER_B.id,
      sender: { name: 'Me' },
      receiver: { name: 'Priya' },
      targetDogId: 'dog_1',
      targetDog: { name: 'Bruno' },
    },
  };
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  loadOwnedConversationMock.mockReset();
  messageFindManyMock.mockReset();
});

describe('GET /api/conversations/[id]', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/conversations/[id]/route');

    const res = await GET(new Request('http://test'), params('conv_1'));

    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent conversation or one the caller isn't a participant of", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockRejectedValue(
      new FakeConversationAccessError('Conversation not found'),
    );
    const { GET } = await import('@/app/api/conversations/[id]/route');

    const res = await GET(new Request('http://test'), params('conv_1'));

    expect(res.status).toBe(404);
  });

  it('returns messages in chronological (oldest-first) order for a matched participant', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    // findMany is queried newest-first (desc) — the route must reverse it.
    messageFindManyMock.mockResolvedValue([
      {
        id: 'm2',
        body: 'second',
        senderId: USER_B.id,
        createdAt: new Date('2026-09-11T00:02:00.000Z'),
      },
      {
        id: 'm1',
        body: 'first',
        senderId: USER_A.id,
        createdAt: new Date('2026-09-11T00:01:00.000Z'),
      },
    ]);
    const { GET } = await import('@/app/api/conversations/[id]/route');

    const res = await GET(new Request('http://test'), params('conv_1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['m1', 'm2']);
    expect(body.messages[0].isMine).toBe(true);
    expect(body.messages[1].isMine).toBe(false);
    expect(body.otherUserName).toBe('Priya');
  });
});
