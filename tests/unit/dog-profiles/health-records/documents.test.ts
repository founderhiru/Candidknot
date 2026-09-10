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

const healthRecordFindUniqueMock = vi.fn();
const healthRecordFindUniqueOrThrowMock = vi.fn();
const documentFindUniqueMock = vi.fn();
const documentCreateMock = vi.fn();
const documentDeleteMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    healthRecord: {
      findUnique: healthRecordFindUniqueMock,
      findUniqueOrThrow: healthRecordFindUniqueOrThrowMock,
    },
    healthDocument: {
      findUnique: documentFindUniqueMock,
      create: documentCreateMock,
      delete: documentDeleteMock,
    },
  },
}));

const uploadPrivateObjectMock = vi.fn();
const deleteObjectMock = vi.fn();
const getSignedDownloadUrlMock = vi.fn();
vi.mock('@/lib/storage', () => ({
  uploadPrivateObject: uploadPrivateObjectMock,
  deleteObject: deleteObjectMock,
  getSignedDownloadUrl: getSignedDownloadUrlMock,
  DOCUMENT_DOWNLOAD_TTL_SECONDS: 300,
}));

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function uploadRequest(file: File | null) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return new Request('http://test', { method: 'POST', body: formData });
}

function recordParams(id: string, recordId: string) {
  return { params: Promise.resolve({ id, recordId }) };
}

function docParams(id: string, recordId: string, documentId: string) {
  return { params: Promise.resolve({ id, recordId, documentId }) };
}

beforeEach(() => {
  loadOwnedDogMock.mockReset();
  healthRecordFindUniqueMock.mockReset();
  healthRecordFindUniqueOrThrowMock.mockReset();
  documentFindUniqueMock.mockReset();
  documentCreateMock.mockReset();
  documentDeleteMock.mockReset();
  uploadPrivateObjectMock.mockReset();
  deleteObjectMock.mockReset();
  getSignedDownloadUrlMock.mockReset();
});

describe('POST /api/dog-profiles/[id]/health-records/[recordId]/documents', () => {
  it('returns 404 when the dog does not exist or belongs to someone else', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { POST } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/route'
    );

    const res = await POST(
      uploadRequest(makeFile('a.pdf', 'application/pdf')),
      recordParams('dog_1', 'hr_1'),
    );

    expect(res.status).toBe(404);
    expect(uploadPrivateObjectMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the record belongs to a different dog (cross-dog IDOR)', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_2' });
    const { POST } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/route'
    );

    const res = await POST(
      uploadRequest(makeFile('a.pdf', 'application/pdf')),
      recordParams('dog_1', 'hr_1'),
    );

    expect(res.status).toBe(404);
    expect(uploadPrivateObjectMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type with 400, without uploading or writing to the DB', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_1' });
    const { POST } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/route'
    );

    const res = await POST(
      uploadRequest(makeFile('a.exe', 'application/x-msdownload')),
      recordParams('dog_1', 'hr_1'),
    );

    expect(res.status).toBe(400);
    expect(uploadPrivateObjectMock).not.toHaveBeenCalled();
    expect(documentCreateMock).not.toHaveBeenCalled();
  });

  it('uploads as a PRIVATE object and persists NO url — only storageKey/fileName/mimeType/sizeBytes', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_1' });
    uploadPrivateObjectMock.mockResolvedValue({
      storageKey: 'dogs/dog_1/health-records/hr_1/fixed-uuid.pdf',
    });
    documentCreateMock.mockResolvedValue({ id: 'doc_1' });
    healthRecordFindUniqueOrThrowMock.mockResolvedValue({
      id: 'hr_1',
      dogId: 'dog_1',
      type: 'other',
      title: 'Checkup',
      occurredOn: new Date('2026-01-01'),
      vetName: null,
      notes: null,
      documents: [{ id: 'doc_1', fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 1024 }],
    });
    const { POST } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/route'
    );

    const res = await POST(
      uploadRequest(makeFile('a.pdf', 'application/pdf')),
      recordParams('dog_1', 'hr_1'),
    );

    expect(res.status).toBe(201);
    expect(uploadPrivateObjectMock).toHaveBeenCalledWith(
      'dogs/dog_1/health-records/hr_1/fixed-uuid.pdf',
      expect.any(Buffer),
      'application/pdf',
    );
    const createArgs = documentCreateMock.mock.calls[0]?.[0];
    expect(createArgs.data).not.toHaveProperty('url');
    expect(createArgs.data.storageKey).toBe('dogs/dog_1/health-records/hr_1/fixed-uuid.pdf');

    const body = await res.json();
    // The response's document list must never include a url or storageKey.
    expect(body.documents[0]).not.toHaveProperty('url');
    expect(body.documents[0]).not.toHaveProperty('storageKey');
  });
});

describe('DELETE .../documents/[documentId]', () => {
  it('returns 404 when the document belongs to a different record (cross-record IDOR)', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_1' });
    documentFindUniqueMock.mockResolvedValue({
      id: 'doc_1',
      healthRecordId: 'hr_2',
      storageKey: 'k',
    });
    const { DELETE } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/[documentId]/route'
    );

    const res = await DELETE(new Request('http://test'), docParams('dog_1', 'hr_1', 'doc_1'));

    expect(res.status).toBe(404);
    expect(deleteObjectMock).not.toHaveBeenCalled();
    expect(documentDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes the storage object then the DB row when the chain matches', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_1' });
    documentFindUniqueMock.mockResolvedValue({
      id: 'doc_1',
      healthRecordId: 'hr_1',
      storageKey: 'dogs/dog_1/health-records/hr_1/x.pdf',
    });
    const { DELETE } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/[documentId]/route'
    );

    const res = await DELETE(new Request('http://test'), docParams('dog_1', 'hr_1', 'doc_1'));

    expect(res.status).toBe(200);
    expect(deleteObjectMock).toHaveBeenCalledWith('dogs/dog_1/health-records/hr_1/x.pdf');
    expect(documentDeleteMock).toHaveBeenCalledWith({ where: { id: 'doc_1' } });
  });
});

describe('GET .../documents/[documentId]/download (the ONLY read path for a document)', () => {
  it('returns 404 when the dog does not exist or belongs to someone else, without generating a signed URL', async () => {
    loadOwnedDogMock.mockRejectedValue(new FakeNotFoundError('Dog profile not found'));
    const { GET } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/[documentId]/download/route'
    );

    const res = await GET(new Request('http://test'), docParams('dog_1', 'hr_1', 'doc_1'));

    expect(res.status).toBe(404);
    expect(getSignedDownloadUrlMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the record belongs to a different dog (cross-dog IDOR)', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_2' });
    const { GET } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/[documentId]/download/route'
    );

    const res = await GET(new Request('http://test'), docParams('dog_1', 'hr_1', 'doc_1'));

    expect(res.status).toBe(404);
    expect(getSignedDownloadUrlMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the document belongs to a different record (cross-record IDOR)', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_1' });
    documentFindUniqueMock.mockResolvedValue({
      id: 'doc_1',
      healthRecordId: 'hr_OTHER',
      storageKey: 'k',
    });
    const { GET } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/[documentId]/download/route'
    );

    const res = await GET(new Request('http://test'), docParams('dog_1', 'hr_1', 'doc_1'));

    expect(res.status).toBe(404);
    expect(getSignedDownloadUrlMock).not.toHaveBeenCalled();
  });

  it('generates a fresh signed URL only once the full ownership chain is verified, and never leaks the storageKey', async () => {
    loadOwnedDogMock.mockResolvedValue({ id: 'dog_1' });
    healthRecordFindUniqueMock.mockResolvedValue({ id: 'hr_1', dogId: 'dog_1' });
    documentFindUniqueMock.mockResolvedValue({
      id: 'doc_1',
      healthRecordId: 'hr_1',
      storageKey: 'dogs/dog_1/health-records/hr_1/x.pdf',
    });
    getSignedDownloadUrlMock.mockResolvedValue('https://signed.example/token');
    const { GET } = await import(
      '@/app/api/dog-profiles/[id]/health-records/[recordId]/documents/[documentId]/download/route'
    );

    const res = await GET(new Request('http://test'), docParams('dog_1', 'hr_1', 'doc_1'));

    expect(res.status).toBe(200);
    expect(getSignedDownloadUrlMock).toHaveBeenCalledWith('dogs/dog_1/health-records/hr_1/x.pdf');
    const body = await res.json();
    expect(body.url).toBe('https://signed.example/token');
    expect(body.expiresInSeconds).toBe(300);
    expect(body).not.toHaveProperty('storageKey');
  });
});
