// @vitest-environment node
//
// Phase 3: GET/PATCH /api/dog-profiles/[id] must let an owner manage their
// own dog, but reject User A reading or writing a dog owned by User B —
// the core IDOR requirement for Phase 3.
//
// SECURITY CORRECTION: a dog that exists but belongs to someone else must
// respond IDENTICALLY to a dog that doesn't exist at all — 404, same body
// — never 401/403. The ownership check (requireResourceOwner) still runs
// on every request; only the response is indistinguishable from not-found.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

class FakeAuthError extends Error {
  readonly status = 401;
}
const requireResourceOwnerMock = vi.fn();
vi.mock('@/lib/auth', () => ({
  AuthError: FakeAuthError,
  requireResourceOwner: requireResourceOwnerMock,
}));

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { dogProfile: { findUnique: findUniqueMock, update: updateMock } },
}));

const USER_A = { id: 'user_a', email: 'a@example.com' };
const USER_B = { id: 'user_b', email: 'b@example.com' };

const DOG_OWNED_BY_A = {
  id: 'dog_1',
  slug: 'rex-mumbai',
  name: 'Rex',
  breed: 'Pug',
  city: 'Mumbai',
  latitude: 19.076,
  longitude: 72.8777,
  ageYears: 4,
  sex: 'Male',
  bio: 'Loyal companion.',
  isVerified: false,
  ownerId: USER_A.id,
};

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  requireResourceOwnerMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
});

describe('GET /api/dog-profiles/[id]', () => {
  it('returns 404 when the dog does not exist, before any ownership check', async () => {
    findUniqueMock.mockResolvedValue(null);
    const { GET } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await GET(
      new Request('http://test/api/dog-profiles/missing'),
      routeParams('missing'),
    );

    expect(res.status).toBe(404);
    expect(requireResourceOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 404 (not 401/403) for User A reading User B's dog, while still performing the ownership check (IDOR)", async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockRejectedValue(
      new FakeAuthError('Not authorized to access this resource'),
    );
    const { GET } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await GET(new Request('http://test/api/dog-profiles/dog_1'), routeParams('dog_1'));

    expect(res.status).toBe(404);
    // The ownership check must still have actually run — this isn't a
    // shortcut that skips the check, only a response-shape change.
    expect(requireResourceOwnerMock).toHaveBeenCalledWith(USER_A.id);
  });

  it('responds identically (same status + body) for a missing dog and a dog owned by someone else', async () => {
    const { GET } = await import('@/app/api/dog-profiles/[id]/route');

    findUniqueMock.mockResolvedValue(null);
    const notFoundRes = await GET(
      new Request('http://test/api/dog-profiles/missing'),
      routeParams('missing'),
    );

    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockRejectedValue(
      new FakeAuthError('Not authorized to access this resource'),
    );
    const notOwnedRes = await GET(
      new Request('http://test/api/dog-profiles/dog_1'),
      routeParams('dog_1'),
    );

    expect(notOwnedRes.status).toBe(notFoundRes.status);
    expect(await notOwnedRes.json()).toEqual(await notFoundRes.json());
  });

  it('allows the owner to read their own dog', async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockResolvedValue(USER_A);
    const { GET } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await GET(new Request('http://test/api/dog-profiles/dog_1'), routeParams('dog_1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('dog_1');
    expect(body.ownerId).toBe(USER_A.id);
  });
});

describe('PATCH /api/dog-profiles/[id]', () => {
  const patchBody = { ...DOG_OWNED_BY_A, name: 'Rex Updated' };

  function patchRequest(body: unknown) {
    return new Request('http://test/api/dog-profiles/dog_1', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  it('returns 404 for a nonexistent dog without leaking ownership info', async () => {
    findUniqueMock.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await PATCH(patchRequest(patchBody), routeParams('missing'));

    expect(res.status).toBe(404);
  });

  it("returns 404 (not 401/403) for User A editing User B's dog, and never calls update", async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockRejectedValue(
      new FakeAuthError('Not authorized to access this resource'),
    );
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await PATCH(patchRequest(patchBody), routeParams('dog_1'));

    expect(res.status).toBe(404);
    expect(requireResourceOwnerMock).toHaveBeenCalledWith(USER_A.id);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('allows the owner to update their own dog', async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockResolvedValue(USER_A);
    updateMock.mockResolvedValue({ ...DOG_OWNED_BY_A, name: 'Rex Updated' });
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await PATCH(patchRequest(patchBody), routeParams('dog_1'));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'dog_1' } }));
    const body = await res.json();
    expect(body.name).toBe('Rex Updated');
  });

  it('ignores a client-supplied ownerId/slug in the update body', async () => {
    findUniqueMock.mockResolvedValue(DOG_OWNED_BY_A);
    requireResourceOwnerMock.mockResolvedValue(USER_A);
    updateMock.mockResolvedValue(DOG_OWNED_BY_A);
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/route');

    await PATCH(
      patchRequest({ ...patchBody, ownerId: USER_B.id, slug: 'hijacked-slug' }),
      routeParams('dog_1'),
    );

    const [firstCall] = updateMock.mock.calls;
    if (!firstCall) throw new Error('updateMock was not called');
    const callArgs = firstCall[0];
    expect(callArgs.data.ownerId).toBeUndefined();
    expect(callArgs.data.slug).toBeUndefined();
  });
});
