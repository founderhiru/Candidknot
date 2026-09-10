// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('node:crypto', () => ({ randomUUID: () => 'fixed-uuid' }));

class FakeNotFoundError extends Error {
  readonly status = 404;
}
const loadOwnedDogMock = vi.fn();
vi.mock('@/lib/dog-ownership', () => ({
  NotFoundError: FakeNotFoundError,
  loadOwnedDog: loadOwnedDogMock,
}));

const countMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { dogPhoto: { count: countMock, create: createMock } },
}));

const uploadPublicObjectMock = vi.fn();
vi.mock('@/lib/storage', () => ({
  uploadPublicObject: uploadPublicObjectMock,
}));

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function postRequestWithFile(file: File | null) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return new Request('http://test/api/dog-profiles/dog_1/photos', {
    method: 'POST',
    body: formData,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  loadOwnedDogMock.mockReset();
  countMock.mockReset();
  createMock.mockReset();
  uploadPublicObjectMock.mockReset();
});

describe('POST /api/dog-profiles/[id]/photos', () => {
  it('returns 404 when the dog does not exist or belongs to someone else', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { POST } = await import('@/app/api/dog-profiles/[id]/photos/route');

    const res = await POST(
      postRequestWithFile(makeFile('a.jpg', 'image/jpeg')),
      routeParams('dog_1'),
    );

    expect(res.status).toBe(404);
    expect(uploadPublicObjectMock).not.toHaveBeenCalled();
  });

  it('rejects with 400 when no file is provided, without touching storage or the DB', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    countMock.mockResolvedValue(0);
    const { POST } = await import('@/app/api/dog-profiles/[id]/photos/route');

    const res = await POST(postRequestWithFile(null), routeParams('dog_1'));

    expect(res.status).toBe(400);
    expect(uploadPublicObjectMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects with 400 once the 6-photo limit is reached, without touching storage', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    countMock.mockResolvedValue(6);
    const { POST } = await import('@/app/api/dog-profiles/[id]/photos/route');

    const res = await POST(
      postRequestWithFile(makeFile('a.jpg', 'image/jpeg')),
      routeParams('dog_1'),
    );

    expect(res.status).toBe(400);
    expect(uploadPublicObjectMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid file type with 400, without touching storage or the DB', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    countMock.mockResolvedValue(0);
    const { POST } = await import('@/app/api/dog-profiles/[id]/photos/route');

    const res = await POST(
      postRequestWithFile(makeFile('a.gif', 'image/gif')),
      routeParams('dog_1'),
    );

    expect(res.status).toBe(400);
    expect(uploadPublicObjectMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('uploads and creates a photo at the next position, keyed under the dog id from the URL', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    countMock.mockResolvedValue(2);
    uploadPublicObjectMock.mockResolvedValue({
      storageKey: 'dogs/dog_1/photos/fixed-uuid.jpg',
      url: 'https://cdn.test/dogs/dog_1/photos/fixed-uuid.jpg',
    });
    createMock.mockResolvedValue({
      id: 'photo_new',
      url: 'https://cdn.test/dogs/dog_1/photos/fixed-uuid.jpg',
      position: 2,
    });
    const { POST } = await import('@/app/api/dog-profiles/[id]/photos/route');

    const res = await POST(
      postRequestWithFile(makeFile('a.jpg', 'image/jpeg')),
      routeParams('dog_1'),
    );

    expect(res.status).toBe(201);
    expect(uploadPublicObjectMock).toHaveBeenCalledWith(
      'dogs/dog_1/photos/fixed-uuid.jpg',
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dogId: 'dog_1', position: 2 }) }),
    );
  });
});
