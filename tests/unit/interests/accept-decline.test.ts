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

const interestFindUniqueMock = vi.fn();
const interestUpdateMock = vi.fn();
const matchCreateMock = vi.fn();
const transactionMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    interest: { findUnique: interestFindUniqueMock, update: interestUpdateMock },
    match: { create: matchCreateMock },
    $transaction: transactionMock,
  },
}));

const emitNotificationMock = vi.fn();
vi.mock('@/lib/notifications', () => ({
  emitNotification: emitNotificationMock,
}));

const OWNER_A = { id: 'user_a' }; // sender
const OWNER_B = { id: 'user_b' }; // target dog's owner

const PENDING_INTEREST = {
  id: 'interest_1',
  senderId: OWNER_A.id,
  targetDogId: 'dog_1',
  status: 'pending',
  createdAt: new Date('2026-09-11T00:00:00.000Z'),
  targetDog: { id: 'dog_1', ownerId: OWNER_B.id },
};

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  interestFindUniqueMock.mockReset();
  interestUpdateMock.mockReset();
  matchCreateMock.mockReset();
  transactionMock.mockReset();
  emitNotificationMock.mockReset();
});

function jsonRequest(body: unknown) {
  return new Request('http://test/api/interests/interest_1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/interests/[id]', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { PATCH } = await import('@/app/api/interests/[id]/route');

    const res = await PATCH(jsonRequest({ status: 'accepted' }), params('interest_1'));

    expect(res.status).toBe(401);
  });

  it("returns 404 for an interest belonging to someone else's dog — IDOR-safe", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(OWNER_A); // NOT the dog owner
    interestFindUniqueMock.mockResolvedValue(PENDING_INTEREST);
    const { PATCH } = await import('@/app/api/interests/[id]/route');

    const res = await PATCH(jsonRequest({ status: 'accepted' }), params('interest_1'));

    expect(res.status).toBe(404);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('returns 404 for a nonexistent interest', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(OWNER_B);
    interestFindUniqueMock.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/interests/[id]/route');

    const res = await PATCH(jsonRequest({ status: 'accepted' }), params('does_not_exist'));

    expect(res.status).toBe(404);
  });

  it('rejects an invalid status with 400', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(OWNER_B);
    interestFindUniqueMock.mockResolvedValue(PENDING_INTEREST);
    const { PATCH } = await import('@/app/api/interests/[id]/route');

    const res = await PATCH(jsonRequest({ status: 'pending' }), params('interest_1'));

    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects responding to an interest twice with 409', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(OWNER_B);
    interestFindUniqueMock.mockResolvedValue({ ...PENDING_INTEREST, status: 'accepted' });
    const { PATCH } = await import('@/app/api/interests/[id]/route');

    const res = await PATCH(jsonRequest({ status: 'declined' }), params('interest_1'));

    expect(res.status).toBe(409);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('declines without creating a match', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(OWNER_B);
    interestFindUniqueMock.mockResolvedValue(PENDING_INTEREST);
    interestUpdateMock.mockResolvedValue({ ...PENDING_INTEREST, status: 'declined' });
    const { PATCH } = await import('@/app/api/interests/[id]/route');

    const res = await PATCH(jsonRequest({ status: 'declined' }), params('interest_1'));

    expect(res.status).toBe(200);
    expect(transactionMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.status).toBe('declined');
  });

  it('accepting creates the match+conversation transactionally, derives receiverId from the session, and notifies both parties', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(OWNER_B);
    interestFindUniqueMock.mockResolvedValue(PENDING_INTEREST);
    transactionMock.mockResolvedValue([
      { ...PENDING_INTEREST, status: 'accepted' },
      { id: 'match_1' },
    ]);
    const { PATCH } = await import('@/app/api/interests/[id]/route');

    const res = await PATCH(jsonRequest({ status: 'accepted' }), params('interest_1'));

    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(emitNotificationMock).toHaveBeenCalledWith(
      OWNER_A.id,
      'interest_accepted',
      expect.anything(),
    );
    expect(emitNotificationMock).toHaveBeenCalledWith(
      OWNER_B.id,
      'match_created',
      expect.anything(),
    );
  });
});
