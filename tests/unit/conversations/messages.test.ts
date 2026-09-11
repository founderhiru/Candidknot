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

const messageCreateMock = vi.fn();
const messageCountMock = vi.fn();
const conversationUpdateMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    message: { create: messageCreateMock, count: messageCountMock },
    conversation: { update: conversationUpdateMock },
  },
}));

const hasActiveEntitlementMock = vi.fn();
vi.mock('@/lib/entitlements', () => ({
  CONNECTION_MESSAGING_SERVICE: 'connection_messaging',
  FREE_MESSAGE_LIMIT: 3,
  hasActiveEntitlement: hasActiveEntitlementMock,
}));

const emitNotificationMock = vi.fn();
vi.mock('@/lib/notifications', () => ({
  emitNotification: emitNotificationMock,
}));

const USER_A = { id: 'user_a' };
const USER_B = { id: 'user_b' };

function ownedConversation() {
  return {
    id: 'conv_1',
    matchId: 'match_1',
    match: { senderId: USER_A.id, receiverId: USER_B.id },
  };
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request('http://test/api/conversations/conv_1/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  loadOwnedConversationMock.mockReset();
  messageCreateMock.mockReset();
  messageCountMock.mockReset();
  messageCountMock.mockResolvedValue(0); // below FREE_MESSAGE_LIMIT by default
  hasActiveEntitlementMock.mockReset();
  conversationUpdateMock.mockReset();
  emitNotificationMock.mockReset();
});

describe('POST /api/conversations/[id]/messages', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: 'hi' }), params('conv_1'));

    expect(res.status).toBe(401);
    expect(messageCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a conversation the caller isn't part of (unmatched/nonexistent) — no message created", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockRejectedValue(
      new FakeConversationAccessError('Conversation not found'),
    );
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: 'hi' }), params('conv_1'));

    expect(res.status).toBe(404);
    expect(messageCreateMock).not.toHaveBeenCalled();
  });

  it('rejects an empty message with 400', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: '' }), params('conv_1'));

    expect(res.status).toBe(400);
    expect(messageCreateMock).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only message with 400', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: '   \n\t  ' }), params('conv_1'));

    expect(res.status).toBe(400);
    expect(messageCreateMock).not.toHaveBeenCalled();
  });

  it('rejects an oversized message with 400', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: 'a'.repeat(2001) }), params('conv_1'));

    expect(res.status).toBe(400);
    expect(messageCreateMock).not.toHaveBeenCalled();
  });

  it('creates the message with senderId derived from the session, ignoring a client-supplied senderId/userId', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    messageCreateMock.mockResolvedValue({
      id: 'msg_1',
      body: 'Hello!',
      senderId: USER_A.id,
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(
      jsonRequest({ body: 'Hello!', senderId: 'someone_else', userId: 'someone_else' }),
      params('conv_1'),
    );

    expect(res.status).toBe(201);
    const [firstCall] = messageCreateMock.mock.calls;
    if (!firstCall) throw new Error('messageCreateMock was not called');
    expect(firstCall[0].data).toEqual({
      conversationId: 'conv_1',
      senderId: USER_A.id,
      body: 'Hello!',
    });
    const body = await res.json();
    expect(body.senderId).toBe(USER_A.id);
    expect(body.isMine).toBe(true);
  });

  it('trims the body before storing it', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    messageCreateMock.mockResolvedValue({
      id: 'msg_1',
      body: 'Hello!',
      senderId: USER_A.id,
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    await POST(jsonRequest({ body: '  Hello!  ' }), params('conv_1'));

    const [firstCall] = messageCreateMock.mock.calls;
    if (!firstCall) throw new Error('messageCreateMock was not called');
    expect(firstCall[0].data.body).toBe('Hello!');
  });

  it('notifies the other participant, not the sender', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    messageCreateMock.mockResolvedValue({
      id: 'msg_1',
      body: 'Hello!',
      senderId: USER_A.id,
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    await POST(jsonRequest({ body: 'Hello!' }), params('conv_1'));

    expect(emitNotificationMock).toHaveBeenCalledWith(
      USER_B.id,
      'message_received',
      expect.anything(),
    );
    expect(emitNotificationMock).not.toHaveBeenCalledWith(
      USER_A.id,
      'message_received',
      expect.anything(),
    );
  });
});

describe('POST /api/conversations/[id]/messages — Phase C free-message limit', () => {
  beforeEach(() => {
    requireAuthenticatedUserMock.mockReset();
    loadOwnedConversationMock.mockReset();
    messageCreateMock.mockReset();
    messageCountMock.mockReset();
    hasActiveEntitlementMock.mockReset();
    conversationUpdateMock.mockReset();
    emitNotificationMock.mockReset();
  });

  it('allows sending under the free limit without checking entitlement', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    messageCountMock.mockResolvedValue(2); // limit is 3 — this would be the 3rd message
    messageCreateMock.mockResolvedValue({
      id: 'msg_1',
      body: 'Hello!',
      senderId: USER_A.id,
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: 'Hello!' }), params('conv_1'));

    expect(res.status).toBe(201);
    expect(hasActiveEntitlementMock).not.toHaveBeenCalled();
  });

  it('rejects with 402 + requiresPurchase once at the limit without an entitlement', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    messageCountMock.mockResolvedValue(3); // at the limit
    hasActiveEntitlementMock.mockResolvedValue(false);
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: 'One more?' }), params('conv_1'));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.requiresPurchase).toBe(true);
    expect(messageCreateMock).not.toHaveBeenCalled();
  });

  it('allows sending past the limit with an active entitlement', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    messageCountMock.mockResolvedValue(5);
    hasActiveEntitlementMock.mockResolvedValue(true);
    messageCreateMock.mockResolvedValue({
      id: 'msg_1',
      body: 'Still here!',
      senderId: USER_A.id,
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: 'Still here!' }), params('conv_1'));

    expect(res.status).toBe(201);
    expect(hasActiveEntitlementMock).toHaveBeenCalledWith(
      USER_A.id,
      'connection_messaging',
      'conv_1',
    );
  });

  it('checks entitlement for whichever participant is sending, not just the original sender', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_B);
    loadOwnedConversationMock.mockResolvedValue(ownedConversation());
    messageCountMock.mockResolvedValue(3);
    hasActiveEntitlementMock.mockResolvedValue(false);
    const { POST } = await import('@/app/api/conversations/[id]/messages/route');

    const res = await POST(jsonRequest({ body: 'My turn' }), params('conv_1'));

    expect(res.status).toBe(402);
    expect(hasActiveEntitlementMock).toHaveBeenCalledWith(
      USER_B.id,
      'connection_messaging',
      'conv_1',
    );
  });
});
