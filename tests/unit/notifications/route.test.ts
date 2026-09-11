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
const updateManyMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    notificationEvent: { findMany: findManyMock, updateMany: updateManyMock },
  },
}));

const USER_A = { id: 'user_a' };

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'evt_1',
    userId: USER_A.id,
    type: 'interest_received',
    payload: JSON.stringify({ interestId: 'i1' }),
    read: false,
    createdAt: new Date('2026-09-11T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  findManyMock.mockReset();
  updateManyMock.mockReset();
  updateManyMock.mockResolvedValue({ count: 0 });
});

describe('GET /api/notifications', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/notifications/route');

    const res = await GET();

    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("scopes the query to the caller's own events — never a client-supplied userId", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/api/notifications/route');

    await GET();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_A.id },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('returns newest-first order exactly as findMany provided it', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([
      row({ id: 'evt_new', createdAt: new Date('2026-09-11T00:05:00.000Z') }),
      row({ id: 'evt_old', createdAt: new Date('2026-09-11T00:00:00.000Z') }),
    ]);
    const { GET } = await import('@/app/api/notifications/route');

    const res = await GET();
    const body = await res.json();

    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['evt_new', 'evt_old']);
  });

  it('includes a friendly message and the read state, and parses the JSON payload', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([row({ read: true })]);
    const { GET } = await import('@/app/api/notifications/route');

    const res = await GET();
    const body = await res.json();

    expect(body.items[0]).toMatchObject({
      type: 'interest_received',
      message: 'Someone is interested in your dog',
      payload: { interestId: 'i1' },
      read: true,
    });
  });

  it('degrades a malformed payload to {} rather than failing the whole list', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([row({ payload: 'not json' })]);
    const { GET } = await import('@/app/api/notifications/route');

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items[0].payload).toEqual({});
  });

  it('marks currently-unread events as read, scoped to the caller, but reports their original read state in the response', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([
      row({ id: 'evt_unread', read: false }),
      row({ id: 'evt_already_read', read: true }),
    ]);
    const { GET } = await import('@/app/api/notifications/route');

    const res = await GET();
    const body = await res.json();

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ['evt_unread'] }, userId: USER_A.id },
      data: { read: true },
    });
    // The response still shows evt_unread as unread — it reflects state
    // as of the start of this request, not after the mark-as-read side effect.
    expect(body.items.find((i: { id: string }) => i.id === 'evt_unread').read).toBe(false);
  });

  it('skips the update entirely when nothing is unread', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([row({ read: true })]);
    const { GET } = await import('@/app/api/notifications/route');

    await GET();

    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it('still returns the list even if marking as read fails', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findManyMock.mockResolvedValue([row({ read: false })]);
    updateManyMock.mockRejectedValue(new Error('db unavailable'));
    const { GET } = await import('@/app/api/notifications/route');

    const res = await GET();

    expect(res.status).toBe(200);
  });
});
