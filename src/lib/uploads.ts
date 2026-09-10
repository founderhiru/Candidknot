// @polsia:user-owned — Phase 4: shared validation for uploaded files. Kept
// separate from src/lib/storage.ts so validation logic (framework-free) can
// be unit-tested without mocking the S3 client.
import 'server-only';

export class UploadValidationError extends Error {}

const PHOTO_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const DOCUMENT_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_PHOTOS_PER_DOG = 6;

function validate(
  file: File,
  allowedTypes: Record<string, string>,
  maxBytes: number,
  kind: string,
): string {
  const extension = allowedTypes[file.type];
  if (!extension) {
    throw new UploadValidationError(
      `Unsupported ${kind} type. Allowed: ${Object.keys(allowedTypes).join(', ')}.`,
    );
  }
  if (file.size > maxBytes) {
    throw new UploadValidationError(
      `${kind} is too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB.`,
    );
  }
  if (file.size === 0) {
    throw new UploadValidationError(`${kind} is empty.`);
  }
  return extension;
}

/** Validates a photo upload. Returns the file extension to use for the storage key. */
export function validatePhotoFile(file: File): string {
  return validate(file, PHOTO_MIME_TYPES, MAX_PHOTO_BYTES, 'Photo');
}

/** Validates a health document upload. Returns the file extension to use for the storage key. */
export function validateDocumentFile(file: File): string {
  return validate(file, DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES, 'Document');
}
