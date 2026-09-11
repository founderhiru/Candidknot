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

const hasActiveEntitlementMock = vi.fn();
vi.mock('@/lib/entitlements', () => ({
  CONNECTION_MESSAGING_SERVICE: 'connection_messaging',
  FREE_MESSAGE_LIMIT: 3,
  hasActiveEntitlement: hasActiveEntitlementMock,
}));

const messageCountMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { message: { count: messageCountMock } },
}));

const USER_A = { id: 'user_a' };

function req(query: string) {
  return new Request(`http://test/api/entitlements/check${query}`);
}

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  loadOwnedConversationMock.mockReset();
  hasActiveEntitlementMock.mockReset();
  messageCountMock.mockReset();
});

describe('GET /api/entitlements/check', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/entitlements/check/route');

    const res = await GET(req('?service=connection_messaging'));

    expect(res.status).toBe(401);
  });

  it('requires a service query param', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    const { GET } = await import('@/app/api/entitlements/check/route');

    const res = await GET(req(''));

    expect(res.status).toBe(400);
  });

  it('checks entitlement scoped to the authenticated user, never a client-supplied userId', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    hasActiveEntitlementMock.mockResolvedValue(true);
    const { GET } = await import('@/app/api/entitlements/check/route');

    await GET(req('?service=connection_messaging&scopeId=conv_1'));

    expect(hasActiveEntitlementMock).toHaveBeenCalledWith(
      USER_A.id,
      'connection_messaging',
      'conv_1',
    );
  });

  it("returns 404 for a conversation scopeId the caller doesn't own — never leaks a message count", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    hasActiveEntitlementMock.mockResolvedValue(false);
    loadOwnedConversationMock.mockRejectedValue(
      new FakeConversationAccessError('Conversation not found'),
    );
    const { GET } = await import('@/app/api/entitlements/check/route');

    const res = await GET(req('?service=connection_messaging&scopeId=not_mine'));

    expect(res.status).toBe(404);
    expect(messageCountMock).not.toHaveBeenCalled();
  });

  it('computes freeMessagesRemaining for an owned, not-yet-entitled conversation', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    hasActiveEntitlementMock.mockResolvedValue(false);
    loadOwnedConversationMock.mockResolvedValue({ id: 'conv_1' });
    messageCountMock.mockResolvedValue(2);
    const { GET } = await import('@/app/api/entitlements/check/route');

    const res = await GET(req('?service=connection_messaging&scopeId=conv_1'));
    const body = await res.json();

    expect(body).toEqual({ active: false, freeMessagesRemaining: 1 });
  });

  it('reports freeMessagesRemaining as null once entitled', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    hasActiveEntitlementMock.mockResolvedValue(true);
    loadOwnedConversationMock.mockResolvedValue({ id: 'conv_1' });
    const { GET } = await import('@/app/api/entitlements/check/route');

    const res = await GET(req('?service=connection_messaging&scopeId=conv_1'));
    const body = await res.json();

    expect(body).toEqual({ active: true, freeMessagesRemaining: null });
    expect(messageCountMock).not.toHaveBeenCalled();
  });

  it('leaves freeMessagesRemaining null for non-messaging services', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    hasActiveEntitlementMock.mockResolvedValue(false);
    const { GET } = await import('@/app/api/entitlements/check/route');

    const res = await GET(req('?service=health_reports'));
    const body = await res.json();

    expect(body).toEqual({ active: false, freeMessagesRemaining: null });
    expect(loadOwnedConversationMock).not.toHaveBeenCalled();
  });
});
