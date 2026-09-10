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

const findUniqueMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    ownerProfile: { findUnique: findUniqueMock, create: createMock, update: updateMock },
  },
}));

const USER_A = { id: 'user_a', email: 'a@example.com' };

const VALID_BODY = { city: 'Hyderabad', bio: 'Owner of two very good dogs.' };

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  findUniqueMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
});

function jsonRequest(method: string, body: unknown) {
  return new Request('http://test/api/owner-profile', { method, body: JSON.stringify(body) });
}

describe('GET /api/owner-profile', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { GET } = await import('@/app/api/owner-profile/route');

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 404 when the authenticated user has no profile yet', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findUniqueMock.mockResolvedValue(null);
    const { GET } = await import('@/app/api/owner-profile/route');

    const res = await GET();

    expect(res.status).toBe(404);
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_A.id } }),
    );
  });

  it("returns the authenticated user's own profile", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findUniqueMock.mockResolvedValue({ id: 'op_1', userId: USER_A.id, ...VALID_BODY });
    const { GET } = await import('@/app/api/owner-profile/route');

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(USER_A.id);
  });
});

describe('POST /api/owner-profile', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { POST } = await import('@/app/api/owner-profile/route');

    const res = await POST(jsonRequest('POST', VALID_BODY));

    expect(res.status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects creating a second profile for the same user with 409', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findUniqueMock.mockResolvedValue({ id: 'op_1', userId: USER_A.id, ...VALID_BODY });
    const { POST } = await import('@/app/api/owner-profile/route');

    const res = await POST(jsonRequest('POST', VALID_BODY));

    expect(res.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a profile with userId from the session, ignoring any userId in the body', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findUniqueMock.mockResolvedValue(null);
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'op_new',
      ...data,
    }));
    const { POST } = await import('@/app/api/owner-profile/route');

    const res = await POST(jsonRequest('POST', { ...VALID_BODY, userId: 'user_someone_else' }));

    expect(res.status).toBe(201);
    const [firstCall] = createMock.mock.calls;
    if (!firstCall) throw new Error('createMock was not called');
    const callArgs = firstCall[0];
    expect(callArgs.data.userId).toBe(USER_A.id);
  });
});

describe('PATCH /api/owner-profile', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { PATCH } = await import('@/app/api/owner-profile/route');

    const res = await PATCH(jsonRequest('PATCH', VALID_BODY));

    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the user has no profile to update yet', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findUniqueMock.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/owner-profile/route');

    const res = await PATCH(jsonRequest('PATCH', VALID_BODY));

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates only the authenticated user's own profile", async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    findUniqueMock.mockResolvedValue({ id: 'op_1', userId: USER_A.id, ...VALID_BODY });
    updateMock.mockResolvedValue({ id: 'op_1', userId: USER_A.id, city: 'Pune', bio: 'Updated.' });
    const { PATCH } = await import('@/app/api/owner-profile/route');

    const res = await PATCH(jsonRequest('PATCH', { city: 'Pune', bio: 'Updated.' }));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_A.id } }),
    );
  });
});
