import * as DocumentPicker from "expo-document-picker";
import type { PickedDocument } from "@/lib/health-api";

// Must match the backend's DOCUMENT_MIME_TYPES / MAX_DOCUMENT_BYTES exactly
// (see src/lib/uploads.ts) — picking a type or size the server would reject
// anyway just wastes an upload attempt and a confusing error.
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB

export class DocumentTooLargeError extends Error {}

/**
 * Opens the native document picker (PDF or image) for a health document
 * upload, returning a PickedDocument ready for uploadHealthDocument(), or
 * null if the user cancelled. Mirrors pickDogPhoto() in pick-photo.ts —
 * one small function so screens don't each re-derive the
 * {uri, name, type} shape the multipart upload needs.
 */
export async function pickHealthDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_TYPES,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (typeof asset.size === "number" && asset.size > MAX_DOCUMENT_BYTES) {
    throw new DocumentTooLargeError("Document is too large. Max 10MB.");
  }

  return {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType ?? "application/octet-stream",
  };
}
