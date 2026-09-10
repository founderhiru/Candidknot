// Mobile (Phase mobile-M2) — thin, typed wrappers around the EXISTING
// /api/dog-profiles* endpoints (audited from src/app/api/dog-profiles/**).
// No new backend capability. Ownership is always server-derived from the
// session (loadOwnedDog/requireResourceOwner on the backend) — nothing here
// sends an ownerId/userId; a mismatched or missing dog id comes back as a
// 404 from the backend itself, which callers surface as-is.
import { apiFetch } from "./api-client";
import {
  DiscoveryFilters,
  DogPhotoItem,
  type DogProfileWrite,
  OkResponse,
  OwnedDogProfileItem,
  OwnedDogProfileList,
} from "./contracts";

export async function listMyDogs(): Promise<OwnedDogProfileList> {
  return apiFetch("/api/dog-profiles/mine", { schema: OwnedDogProfileList });
}

export async function getDog(id: string): Promise<OwnedDogProfileItem> {
  return apiFetch(`/api/dog-profiles/${id}`, { schema: OwnedDogProfileItem });
}

export async function createDog(
  data: DogProfileWrite,
): Promise<OwnedDogProfileItem> {
  return apiFetch("/api/dog-profiles", {
    method: "POST",
    body: JSON.stringify(data),
    schema: OwnedDogProfileItem,
  });
}

export async function updateDog(
  id: string,
  data: DogProfileWrite,
): Promise<OwnedDogProfileItem> {
  return apiFetch(`/api/dog-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    schema: OwnedDogProfileItem,
  });
}

/** Breed suggestions for the Add/Edit Dog form — reads the PUBLIC discovery
 * endpoint's `filters.breeds` (no auth needed, no new endpoint). */
export async function fetchBreedSuggestions(): Promise<string[]> {
  const result = await apiFetch("/api/dog-profiles", {
    skipAuth: true,
    schema: DiscoveryFilters,
  });
  return result.filters.breeds;
}

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

export async function uploadDogPhoto(
  dogId: string,
  image: PickedImage,
): Promise<DogPhotoItem> {
  const formData = new FormData();
  // React Native's fetch/FormData accepts this { uri, name, type } object
  // shape in place of a real File/Blob — see mobile/README.md.
  formData.append("file", {
    uri: image.uri,
    name: image.name,
    type: image.type,
    // biome-ignore lint/suspicious/noExplicitAny: RN's FormData typing doesn't include the native file-object shape.
  } as any);

  return apiFetch(`/api/dog-profiles/${dogId}/photos`, {
    method: "POST",
    body: formData,
    schema: DogPhotoItem,
  });
}

export async function deleteDogPhoto(
  dogId: string,
  photoId: string,
): Promise<OkResponse> {
  return apiFetch(`/api/dog-profiles/${dogId}/photos/${photoId}`, {
    method: "DELETE",
    schema: OkResponse,
  });
}

export async function setCoverPhoto(
  dogId: string,
  photoId: string,
): Promise<DogPhotoItem> {
  return apiFetch(`/api/dog-profiles/${dogId}/photos/${photoId}/position`, {
    method: "PATCH",
    body: JSON.stringify({ position: 0 }),
    schema: DogPhotoItem,
  });
}
