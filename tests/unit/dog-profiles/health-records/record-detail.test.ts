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
const updateMock = vi.fn();
const deleteMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { healthRecord: { findUnique: findUniqueMock, update: updateMock, delete: deleteMock } },
}));

const deletePrivateObjectMock = vi.fn();
vi.mock('@/lib/storage', () => ({
  deletePrivateObject: deletePrivateObjectMock,
}));

function routeParams(id: string, recordId: string) {
  return { params: Promise.resolve({ id, recordId }) };
}

const VALID_BODY = {
  type: 'vetVisit',
  title: 'Checkup',
  occurredOn: '2026-02-01',
  vetName: '',
  notes: '',
};

beforeEach(() => {
  loadOwnedDogMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  deletePrivateObjectMock.mockReset();
});

describe('PATCH /api/dog-profiles/[id]/health-records/[recordId]', () => {
  function patchRequest(body: unknown) {
    return new Request('http://test', { method: 'PATCH', body: JSON.stringify(body) });
  }

  it('returns 404 when the dog does not exist or belongs to someone else', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/health-records/[recordId]/route');

    const res = await PATCH(patchRequest(VALID_BODY), routeParams('dog_1', 'hr_1'));

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the record belongs to a DIFFERENT dog than the URL's id (cross-dog IDOR)", async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_2', documents: [] });
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/health-records/[recordId]/route');

    const res = await PATCH(patchRequest(VALID_BODY), routeParams('dog_1', 'hr_1'));

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('updates the record when the dog matches', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_1', documents: [] });
    updateMock.mockResolvedValue({
      id: 'hr_1',
      dogId: 'dog_1',
      type: 'vetVisit',
      title: 'Checkup',
      occurredOn: new Date('2026-02-01'),
      vetName: null,
      notes: null,
      documents: [],
    });
    const { PATCH } = await import('@/app/api/dog-profiles/[id]/health-records/[recordId]/route');

    const res = await PATCH(patchRequest(VALID_BODY), routeParams('dog_1', 'hr_1'));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'hr_1' } }));
  });
});

describe('DELETE /api/dog-profiles/[id]/health-records/[recordId]', () => {
  it('returns 404 for a record belonging to a different dog, without deleting anything', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_2', documents: [] });
    const { DELETE } = await import('@/app/api/dog-profiles/[id]/health-records/[recordId]/route');

    const res = await DELETE(new Request('http://test'), routeParams('dog_1', 'hr_1'));

    expect(res.status).toBe(404);
    expect(deletePrivateObjectMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('deletes every attached document from storage before deleting the record row', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    findUniqueMock.mockResolvedValue({
      id: 'hr_1',
      dogId: 'dog_1',
      documents: [
        { id: 'doc_1', storageKey: 'dogs/dog_1/health-records/hr_1/a.pdf' },
        { id: 'doc_2', storageKey: 'dogs/dog_1/health-records/hr_1/b.pdf' },
      ],
    });
    const { DELETE } = await import('@/app/api/dog-profiles/[id]/health-records/[recordId]/route');

    const res = await DELETE(new Request('http://test'), routeParams('dog_1', 'hr_1'));

    expect(res.status).toBe(200);
    expect(deletePrivateObjectMock).toHaveBeenCalledWith('dogs/dog_1/health-records/hr_1/a.pdf');
    expect(deletePrivateObjectMock).toHaveBeenCalledWith('dogs/dog_1/health-records/hr_1/b.pdf');
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'hr_1' } });
  });
});
