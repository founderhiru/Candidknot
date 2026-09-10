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

const findManyMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { healthRecord: { findMany: findManyMock, create: createMock } },
}));

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_BODY = {
  type: 'vaccination',
  title: 'Rabies',
  occurredOn: '2026-01-15',
  vetName: 'Dr. Rao',
  notes: '',
};

beforeEach(() => {
  loadOwnedDogMock.mockReset();
  findManyMock.mockReset();
  createMock.mockReset();
});

describe('GET /api/dog-profiles/[id]/health-records', () => {
  it('returns 404 when the dog does not exist or belongs to someone else', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { GET } = await import('@/app/api/dog-profiles/[id]/health-records/route');

    const res = await GET(new Request('http://test'), routeParams('dog_1'));

    expect(res.status).toBe(404);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("lists only the given dog's records", async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/api/dog-profiles/[id]/health-records/route');

    const res = await GET(new Request('http://test'), routeParams('dog_1'));

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dogId: 'dog_1' } }),
    );
  });
});

describe('POST /api/dog-profiles/[id]/health-records', () => {
  function postRequest(body: unknown) {
    return new Request('http://test', { method: 'POST', body: JSON.stringify(body) });
  }

  it('returns 404 when the dog does not exist or belongs to someone else, without creating anything', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { POST } = await import('@/app/api/dog-profiles/[id]/health-records/route');

    const res = await POST(postRequest(VALID_BODY), routeParams('dog_1'));

    expect(res.status).toBe(404);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid body with 400 (bad date format)', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    const { POST } = await import('@/app/api/dog-profiles/[id]/health-records/route');

    const res = await POST(
      postRequest({ ...VALID_BODY, occurredOn: '15 Jan 2026' }),
      routeParams('dog_1'),
    );

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates the record scoped to the dog id from the URL, ignoring any dogId in the body', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    createMock.mockResolvedValue({
      id: 'hr_1',
      dogId: 'dog_1',
      type: 'vaccination',
      title: 'Rabies',
      occurredOn: new Date('2026-01-15'),
      vetName: 'Dr. Rao',
      notes: null,
      documents: [],
    });
    const { POST } = await import('@/app/api/dog-profiles/[id]/health-records/route');

    const res = await POST(
      postRequest({ ...VALID_BODY, dogId: 'dog_someone_elses' }),
      routeParams('dog_1'),
    );

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dogId: 'dog_1' }) }),
    );
  });
});
