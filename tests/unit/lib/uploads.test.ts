// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { validateDocumentFile, validatePhotoFile } from '@/lib/uploads';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], name, { type });
}

describe('validatePhotoFile', () => {
  it('accepts a jpeg within the size limit', () => {
    const file = makeFile('dog.jpg', 'image/jpeg', 1024);
    expect(() => validatePhotoFile(file)).not.toThrow();
    expect(validatePhotoFile(file)).toBe('jpg');
  });

  it('accepts png and webp', () => {
    expect(validatePhotoFile(makeFile('a.png', 'image/png', 1024))).toBe('png');
    expect(validatePhotoFile(makeFile('a.webp', 'image/webp', 1024))).toBe('webp');
  });

  it('rejects an unsupported mime type (e.g. a PDF)', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1024);
    expect(() => validatePhotoFile(file)).toThrow(/Unsupported Photo type/);
  });

  it('rejects a file over the 5MB limit', () => {
    const file = makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
    expect(() => validatePhotoFile(file)).toThrow(/too large/);
  });

  it('rejects an empty file', () => {
    const file = makeFile('empty.jpg', 'image/jpeg', 0);
    expect(() => validatePhotoFile(file)).toThrow(/empty/);
  });
});

describe('validateDocumentFile', () => {
  it('accepts a PDF within the size limit', () => {
    const file = makeFile('cert.pdf', 'application/pdf', 1024);
    expect(validateDocumentFile(file)).toBe('pdf');
  });

  it('accepts jpeg/png scans', () => {
    expect(validateDocumentFile(makeFile('scan.jpg', 'image/jpeg', 1024))).toBe('jpg');
    expect(validateDocumentFile(makeFile('scan.png', 'image/png', 1024))).toBe('png');
  });

  it('rejects an unsupported mime type (e.g. a video)', () => {
    const file = makeFile('clip.mp4', 'video/mp4', 1024);
    expect(() => validateDocumentFile(file)).toThrow(/Unsupported Document type/);
  });

  it('rejects a file over the 10MB limit', () => {
    const file = makeFile('big.pdf', 'application/pdf', 10 * 1024 * 1024 + 1);
    expect(() => validateDocumentFile(file)).toThrow(/too large/);
  });

  it('rejects an empty file', () => {
    const file = makeFile('empty.pdf', 'application/pdf', 0);
    expect(() => validateDocumentFile(file)).toThrow(/empty/);
  });
});
