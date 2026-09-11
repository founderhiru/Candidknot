// Mobile (Health Passport phase) — thin, typed wrappers around the EXISTING
// /api/dog-profiles/[id]/health-records* endpoints (audited from
// src/app/api/dog-profiles/[id]/health-records/**). No new backend
// capability. Ownership is always server-derived from the session
// (loadOwnedDog on the backend) — nothing here sends an ownerId/userId;
// a dog/record/document the caller doesn't own comes back as a 404 from
// the backend itself, which callers surface as-is.
import { apiFetch } from "./api-client";
import { OkResponse } from "./contracts";
import {
  DocumentDownloadUrl,
  HealthRecordItem,
  HealthRecordList,
  type HealthRecordWrite,
} from "./health-contracts";

export async function listHealthRecords(
  dogId: string,
): Promise<HealthRecordList> {
  return apiFetch(`/api/dog-profiles/${dogId}/health-records`, {
    schema: HealthRecordList,
  });
}

export async function createHealthRecord(
  dogId: string,
  data: HealthRecordWrite,
): Promise<HealthRecordItem> {
  return apiFetch(`/api/dog-profiles/${dogId}/health-records`, {
    method: "POST",
    body: JSON.stringify(data),
    schema: HealthRecordItem,
  });
}

export async function updateHealthRecord(
  dogId: string,
  recordId: string,
  data: HealthRecordWrite,
): Promise<HealthRecordItem> {
  return apiFetch(`/api/dog-profiles/${dogId}/health-records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    schema: HealthRecordItem,
  });
}

export async function deleteHealthRecord(
  dogId: string,
  recordId: string,
): Promise<OkResponse> {
  return apiFetch(`/api/dog-profiles/${dogId}/health-records/${recordId}`, {
    method: "DELETE",
    schema: OkResponse,
  });
}

export interface PickedDocument {
  uri: string;
  name: string;
  type: string;
}

export async function uploadHealthDocument(
  dogId: string,
  recordId: string,
  file: PickedDocument,
): Promise<HealthRecordItem> {
  const formData = new FormData();
  // React Native's fetch/FormData accepts this { uri, name, type } object
  // shape in place of a real File/Blob — same approach as uploadDogPhoto
  // in dog-api.ts (see mobile/README.md).
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
    // biome-ignore lint/suspicious/noExplicitAny: RN's FormData typing doesn't include the native file-object shape.
  } as any);

  return apiFetch(
    `/api/dog-profiles/${dogId}/health-records/${recordId}/documents`,
    {
      method: "POST",
      body: formData,
      schema: HealthRecordItem,
    },
  );
}

export async function deleteHealthDocument(
  dogId: string,
  recordId: string,
  documentId: string,
): Promise<OkResponse> {
  return apiFetch(
    `/api/dog-profiles/${dogId}/health-records/${recordId}/documents/${documentId}`,
    { method: "DELETE", schema: OkResponse },
  );
}

/** Requests a fresh short-lived signed URL to view/download a private document. Never cache the result. */
export async function getDocumentDownloadUrl(
  dogId: string,
  recordId: string,
  documentId: string,
): Promise<DocumentDownloadUrl> {
  return apiFetch(
    `/api/dog-profiles/${dogId}/health-records/${recordId}/documents/${documentId}/download`,
    { schema: DocumentDownloadUrl },
  );
}
