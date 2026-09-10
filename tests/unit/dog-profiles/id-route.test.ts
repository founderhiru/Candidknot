// @vitest-environment node
//
// Phase 3/4: GET/PATCH /api/dog-profiles/[id] must let an owner manage
// their own dog, but reject User A reading or writing a dog owned by User
// B — the core IDOR requirement. Ownership itself (loadOwnedDog, including
// the 404-not-401 security correction) is unit-tested directly in
// tests/unit/lib/dog-ownership.test.ts; this file mocks that module at its
// boundary and focuses on what the route does with its result — including
// the Phase 4 addition of embedding photos + healthRecords in the response.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

class FakeNotFoundError extends Error {
  readonly status = 404;
}
const loadOwnedDogMock = vi.fn();
vi.mock('@/lib/dog-ownership', () => ({
  NotFoundError: FakeNotFoundError,
  loadOwnedDog: loadOwnedDogMock,
}));

const findManyDogPhotoMock = vi.fn();
const findManyHealthRecordMock = vi.fn();
const updateMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    dogPhoto: { findMany: findManyDogPhotoMock },
    healthRecord: { findMany: findManyHealthRecordMock },
    dogProfile: { update: updateMock },
  },
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
  loadOwnedDogMock.mockReset();
  findManyDogPhotoMock.mockReset();
  findManyHealthRecordMock.mockReset();
  updateMock.mockReset();
  findManyDogPhotoMock.mockResolvedValue([]);
  findManyHealthRecordMock.mockResolvedValue([]);
});

describe('GET /api/dog-profiles/[id]', () => {
  it('returns 404 when the dog does not exist or belongs to someone else (loadOwnedDog enforces this)', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { GET } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await GET(new Request('http://test/api/dog-profiles/dog_1'), routeParams('dog_1'));

    expect(res.status).toBe(404);
    expect(findManyDogPhotoMock).not.toHaveBeenCalled();
  });

  it('allows the owner to read their own dog, embedding photos and healthRecords', async () => {
    loadOwnedDogMock.mockResolvedValue(DOG_OWNED_BY_A);
    findManyDogPhotoMock.mockResolvedValue([
      { id: 'photo_1', url: 'https://cdn.test/a.jpg', position: 0 },
    ]);
    findManyHealthRecordMock.mockResolvedValue([
      {
        id: 'hr_1',
        dogId: 'dog_1',
        type: 'vaccination',
        title: 'Rabies',
        occurredOn: new Date('2026-01-15'),
        vetName: null,
        notes: null,
        documents: [],
      },
    ]);
    const { GET } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await GET(new Request('http://test/api/dog-profiles/dog_1'), routeParams('dog_1'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('dog_1');
    expect(body.ownerId).toBe(USER_A.id);
    expect(body.photos).toHaveLength(1);
    expect(body.photos[0].id).toBe('photo_1');
    expect(body.healthRecords).toHaveLength(1);
    expect(body.healthRecords[0].occurredOn).toBe('2026-01-15');
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

  it('returns 404 when the dog does not exist or belongs to someone else, and never calls update', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await PATCH(patchRequest(patchBody), routeParams('dog_1'));

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('allows the owner to update their own dog', async () => {
    loadOwnedDogMock.mockResolvedValue(DOG_OWNED_BY_A);
    updateMock.mockResolvedValue({ ...DOG_OWNED_BY_A, name: 'Rex Updated' });
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/route');

    const res = await PATCH(patchRequest(patchBody), routeParams('dog_1'));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'dog_1' } }));
    const body = await res.json();
    expect(body.name).toBe('Rex Updated');
    expect(body.photos).toEqual([]);
    expect(body.healthRecords).toEqual([]);
  });

  it('ignores a client-supplied ownerId/slug in the update body', async () => {
    loadOwnedDogMock.mockResolvedValue(DOG_OWNED_BY_A);
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
