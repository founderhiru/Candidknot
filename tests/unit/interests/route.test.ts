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

const dogProfileFindUniqueMock = vi.fn();
const interestFindUniqueMock = vi.fn();
const interestCreateMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    dogProfile: { findUnique: dogProfileFindUniqueMock },
    interest: { findUnique: interestFindUniqueMock, create: interestCreateMock },
  },
}));

const emitNotificationMock = vi.fn();
vi.mock('@/lib/notifications', () => ({
  emitNotification: emitNotificationMock,
}));

const USER_A = { id: 'user_a', email: 'a@example.com' };
const USER_B = { id: 'user_b', email: 'b@example.com' };

const DOG_OWNED_BY_B = { id: 'dog_1', ownerId: USER_B.id };
const DOG_OWNED_BY_A = { id: 'dog_2', ownerId: USER_A.id };
const DOG_DEMO = { id: 'dog_3', ownerId: null };

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  dogProfileFindUniqueMock.mockReset();
  interestFindUniqueMock.mockReset();
  interestCreateMock.mockReset();
  emitNotificationMock.mockReset();
});

function jsonRequest(body: unknown) {
  return new Request('http://test/api/interests', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/interests', () => {
  it('rejects an unauthenticated request with 401 — guest must sign in first', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { POST } = await import('@/app/api/interests/route');

    const res = await POST(jsonRequest({ targetDogId: 'dog_1' }));

    expect(res.status).toBe(401);
    expect(interestCreateMock).not.toHaveBeenCalled();
  });

  it('rejects a missing targetDogId with 400', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    const { POST } = await import('@/app/api/interests/route');

    const res = await POST(jsonRequest({}));

    expect(res.status).toBe(400);
    expect(dogProfileFindUniqueMock).not.toHaveBeenCalled();
  });

  it('returns 404 for a nonexistent target dog (never leaks existence via a different status)', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    dogProfileFindUniqueMock.mockResolvedValue(null);
    const { POST } = await import('@/app/api/interests/route');

    const res = await POST(jsonRequest({ targetDogId: 'does_not_exist' }));

    expect(res.status).toBe(404);
    expect(interestCreateMock).not.toHaveBeenCalled();
  });

  it('rejects self-interest with 400', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    dogProfileFindUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    const { POST } = await import('@/app/api/interests/route');

    const res = await POST(jsonRequest({ targetDogId: DOG_OWNED_BY_A.id }));

    expect(res.status).toBe(400);
    expect(interestCreateMock).not.toHaveBeenCalled();
  });

  it('rejects a duplicate interest with 409 without creating a second row', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    dogProfileFindUniqueMock.mockResolvedValue(DOG_OWNED_BY_B);
    interestFindUniqueMock.mockResolvedValue({ id: 'existing', senderId: USER_A.id });
    const { POST } = await import('@/app/api/interests/route');

    const res = await POST(jsonRequest({ targetDogId: DOG_OWNED_BY_B.id }));

    expect(res.status).toBe(409);
    expect(interestCreateMock).not.toHaveBeenCalled();
  });

  it('creates an interest with senderId derived from the session, ignoring any senderId/ownerId/userId in the body', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    dogProfileFindUniqueMock.mockResolvedValue(DOG_OWNED_BY_B);
    interestFindUniqueMock.mockResolvedValue(null);
    interestCreateMock.mockResolvedValue({
      id: 'interest_1',
      targetDogId: DOG_OWNED_BY_B.id,
      status: 'pending',
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/interests/route');

    const res = await POST(
      jsonRequest({
        targetDogId: DOG_OWNED_BY_B.id,
        senderId: 'someone_else',
        ownerId: 'someone_else',
        userId: 'someone_else',
      }),
    );

    expect(res.status).toBe(201);
    const [firstCall] = interestCreateMock.mock.calls;
    if (!firstCall) throw new Error('interestCreateMock was not called');
    expect(firstCall[0].data).toEqual({ senderId: USER_A.id, targetDogId: DOG_OWNED_BY_B.id });
  });

  it('allows expressing interest in an ownerless demo dog profile', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    dogProfileFindUniqueMock.mockResolvedValue(DOG_DEMO);
    interestFindUniqueMock.mockResolvedValue(null);
    interestCreateMock.mockResolvedValue({
      id: 'interest_2',
      targetDogId: DOG_DEMO.id,
      status: 'pending',
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/interests/route');

    const res = await POST(jsonRequest({ targetDogId: DOG_DEMO.id }));

    expect(res.status).toBe(201);
  });

  it('emits an interest_received notification to the target dog owner', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    dogProfileFindUniqueMock.mockResolvedValue(DOG_OWNED_BY_B);
    interestFindUniqueMock.mockResolvedValue(null);
    interestCreateMock.mockResolvedValue({
      id: 'interest_1',
      targetDogId: DOG_OWNED_BY_B.id,
      status: 'pending',
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/interests/route');

    await POST(jsonRequest({ targetDogId: DOG_OWNED_BY_B.id }));

    expect(emitNotificationMock).toHaveBeenCalledWith(
      USER_B.id,
      'interest_received',
      expect.anything(),
    );
  });

  it('does not emit a notification for an ownerless demo dog (no one to notify)', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    dogProfileFindUniqueMock.mockResolvedValue(DOG_DEMO);
    interestFindUniqueMock.mockResolvedValue(null);
    interestCreateMock.mockResolvedValue({
      id: 'interest_2',
      targetDogId: DOG_DEMO.id,
      status: 'pending',
      createdAt: new Date('2026-09-11T00:00:00.000Z'),
    });
    const { POST } = await import('@/app/api/interests/route');

    await POST(jsonRequest({ targetDogId: DOG_DEMO.id }));

    expect(emitNotificationMock).not.toHaveBeenCalled();
  });
});
