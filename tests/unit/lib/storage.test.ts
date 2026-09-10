// @vitest-environment node
//
// These tests mock the AWS SDK clients entirely — no real network call is
// made or possible in this sandbox — and assert on WHICH commands/params
// storage.ts sends, plus the shape of what it returns. The central
// security property under test: uploadPrivateObject() (used for health
// documents) must never return a url, and getSignedDownloadUrl() must be
// the only path that can produce one, scoped to a single storageKey with
// an expiry.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    R2_ACCOUNT_ID: 'acct123',
    R2_ACCESS_KEY_ID: 'key',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET_NAME: 'canidknot-uploads',
    R2_PUBLIC_HOSTNAME: 'cdn.canidknot.test',
  },
}));

const sendMock = vi.fn();
const putObjectCommandCtor = vi.fn((input) => ({ __type: 'PutObjectCommand', input }));
const getObjectCommandCtor = vi.fn((input) => ({ __type: 'GetObjectCommand', input }));
const deleteObjectCommandCtor = vi.fn((input) => ({ __type: 'DeleteObjectCommand', input }));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: putObjectCommandCtor,
  GetObjectCommand: getObjectCommandCtor,
  DeleteObjectCommand: deleteObjectCommandCtor,
}));

const getSignedUrlMock = vi.fn();
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

beforeEach(() => {
  sendMock.mockReset();
  getSignedUrlMock.mockReset();
  putObjectCommandCtor.mockClear();
  getObjectCommandCtor.mockClear();
  deleteObjectCommandCtor.mockClear();
});

describe('uploadPublicObject (dog photos)', () => {
  it('PUTs to the configured bucket/key and returns a permanent public url', async () => {
    sendMock.mockResolvedValue({});
    const { uploadPublicObject } = await import('@/lib/storage');

    const result = await uploadPublicObject(
      'dogs/dog_1/photos/abc.jpg',
      Buffer.from('x'),
      'image/jpeg',
    );

    expect(putObjectCommandCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'canidknot-uploads',
        Key: 'dogs/dog_1/photos/abc.jpg',
        ContentType: 'image/jpeg',
      }),
    );
    expect(result).toEqual({
      storageKey: 'dogs/dog_1/photos/abc.jpg',
      url: 'https://cdn.canidknot.test/dogs/dog_1/photos/abc.jpg',
    });
  });
});

describe('uploadPrivateObject (health documents)', () => {
  it('PUTs the object but returns ONLY the storageKey — never a url', async () => {
    sendMock.mockResolvedValue({});
    const { uploadPrivateObject } = await import('@/lib/storage');

    const result = await uploadPrivateObject(
      'dogs/dog_1/health-records/hr_1/doc.pdf',
      Buffer.from('x'),
      'application/pdf',
    );

    expect(putObjectCommandCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'canidknot-uploads',
        Key: 'dogs/dog_1/health-records/hr_1/doc.pdf',
        ContentType: 'application/pdf',
      }),
    );
    expect(result).toEqual({ storageKey: 'dogs/dog_1/health-records/hr_1/doc.pdf' });
    expect(result).not.toHaveProperty('url');
  });
});

describe('getSignedDownloadUrl', () => {
  it('requests a GetObjectCommand for the given key with the default TTL', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.example/one-time-token');
    const { getSignedDownloadUrl, DOCUMENT_DOWNLOAD_TTL_SECONDS } = await import('@/lib/storage');

    const url = await getSignedDownloadUrl('dogs/dog_1/health-records/hr_1/doc.pdf');

    expect(getObjectCommandCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'canidknot-uploads',
        Key: 'dogs/dog_1/health-records/hr_1/doc.pdf',
      }),
    );
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ __type: 'GetObjectCommand' }),
      { expiresIn: DOCUMENT_DOWNLOAD_TTL_SECONDS },
    );
    expect(url).toBe('https://signed.example/one-time-token');
  });

  it('honors a custom expiry when given one', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.example/short-lived');
    const { getSignedDownloadUrl } = await import('@/lib/storage');

    await getSignedDownloadUrl('dogs/dog_1/health-records/hr_1/doc.pdf', 30);

    expect(getSignedUrlMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 30,
    });
  });
});

describe('deleteObject', () => {
  it('sends a DeleteObjectCommand for the given key', async () => {
    sendMock.mockResolvedValue({});
    const { deleteObject } = await import('@/lib/storage');

    await deleteObject('dogs/dog_1/photos/abc.jpg');

    expect(deleteObjectCommandCtor).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'canidknot-uploads', Key: 'dogs/dog_1/photos/abc.jpg' }),
    );
  });
});
