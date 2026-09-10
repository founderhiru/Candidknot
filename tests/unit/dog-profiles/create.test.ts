// @vitest-environment node
//
// Phase 3: POST /api/dog-profiles must derive ownerId from the
// server-side session ONLY, never from the request body, and must reject
// unauthenticated writers. The existing public GET (Discover) is covered
// separately in route.test.ts and is untouched by this change.
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

const createMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { dogProfile: { create: createMock } },
}));

const REGULAR_USER = { id: 'user_2', email: 'regular@example.com' };

const VALID_BODY = {
  name: 'Bruno',
  breed: 'Beagle',
  city: 'Pune',
  latitude: 18.5204,
  longitude: 73.8567,
  ageYears: 2,
  sex: 'Male',
  bio: 'Loves long walks.',
};

function postRequest(body: unknown) {
  return new Request('http://test/api/dog-profiles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/dog-profiles', () => {
  beforeEach(() => {
    requireAuthenticatedUserMock.mockReset();
    createMock.mockReset();
  });

  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { POST } = await import('@/app/api/dog-profiles/route');

    const res = await POST(postRequest(VALID_BODY));

    expect(res.status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates the dog with ownerId from the session, ignoring any ownerId in the body', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(REGULAR_USER);
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'dog_new',
      slug: 'bruno-abc123',
      isVerified: false,
      ...data,
    }));
    const { POST } = await import('@/app/api/dog-profiles/route');

    // Attacker-controlled ownerId in the body must be ignored entirely.
    const res = await POST(postRequest({ ...VALID_BODY, ownerId: 'user_someone_else' }));

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledTimes(1);
    const [firstCall] = createMock.mock.calls;
    if (!firstCall) throw new Error('createMock was not called');
    const callArgs = firstCall[0];
    expect(callArgs.data.ownerId).toBe(REGULAR_USER.id);
    expect(callArgs.data.ownerId).not.toBe('user_someone_else');
  });

  it('rejects an invalid body with 400 and does not touch the database', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(REGULAR_USER);
    const { POST } = await import('@/app/api/dog-profiles/route');

    const res = await POST(postRequest({ ...VALID_BODY, name: '' }));

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });
});
