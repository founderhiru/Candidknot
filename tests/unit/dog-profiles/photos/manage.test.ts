// @vitest-environment node
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

const findUniqueMock = vi.fn();
const deleteMock = vi.fn();
const updateMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { dogPhoto: { findUnique: findUniqueMock, delete: deleteMock, update: updateMock } },
}));

const deletePublicObjectMock = vi.fn();
vi.mock('@/lib/storage', () => ({
  deletePublicObject: deletePublicObjectMock,
}));

function routeParams(id: string, photoId: string) {
  return { params: Promise.resolve({ id, photoId }) };
}

beforeEach(() => {
  loadOwnedDogMock.mockReset();
  findUniqueMock.mockReset();
  deleteMock.mockReset();
  updateMock.mockReset();
  deletePublicObjectMock.mockReset();
});

describe('DELETE /api/dog-profiles/[id]/photos/[photoId]', () => {
  it('returns 404 when the dog does not exist or belongs to someone else, without touching the photo', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { DELETE } = await import('@/app/api/dog-profiles/[id]/photos/[photoId]/route');

    const res = await DELETE(new Request('http://test'), routeParams('dog_1', 'photo_1'));

    expect(res.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the photo belongs to a DIFFERENT dog than the URL's id (cross-dog IDOR), even if that dog is also owned by the caller", async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({ id: 'photo_1', dogId: 'dog_2', storageKey: 'k' });
    const { DELETE } = await import('@/app/api/dog-profiles/[id]/photos/[photoId]/route');

    const res = await DELETE(new Request('http://test'), routeParams('dog_1', 'photo_1'));

    expect(res.status).toBe(404);
    expect(deletePublicObjectMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('deletes the storage object before the DB row, when ownership + dog match', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({
      id: 'photo_1',
      dogId: 'dog_1',
      storageKey: 'dogs/dog_1/photos/x.jpg',
    });
    const { DELETE } = await import('@/app/api/dog-profiles/[id]/photos/[photoId]/route');

    const res = await DELETE(new Request('http://test'), routeParams('dog_1', 'photo_1'));

    expect(res.status).toBe(200);
    expect(deletePublicObjectMock).toHaveBeenCalledWith('dogs/dog_1/photos/x.jpg');
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'photo_1' } });
  });
});

describe('PATCH /api/dog-profiles/[id]/photos/[photoId]/position', () => {
  function patchRequest(body: unknown) {
    return new Request('http://test', { method: 'PATCH', body: JSON.stringify(body) });
  }

  it('returns 404 for a photo belonging to a different dog (cross-dog IDOR)', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({ id: 'photo_1', dogId: 'dog_2' });
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/photos/[photoId]/position/route');

    const res = await PATCH(patchRequest({ position: 0 }), routeParams('dog_1', 'photo_1'));

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range position with 400', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({ id: 'photo_1', dogId: 'dog_1' });
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/photos/[photoId]/position/route');

    const res = await PATCH(patchRequest({ position: 99 }), routeParams('dog_1', 'photo_1'));

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('updates the position when ownership + dog match', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({ id: 'photo_1', dogId: 'dog_1' });
    updateMock.mockResolvedValue({ id: 'photo_1', url: 'https://cdn.test/x.jpg', position: 0 });
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/photos/[photoId]/position/route');

    const res = await PATCH(patchRequest({ position: 0 }), routeParams('dog_1', 'photo_1'));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'photo_1' }, data: { position: 0 } });
  });
});
