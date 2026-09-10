// Mobile (Phase mobile-M2) — thin, typed wrappers around the EXISTING
// /api/owner-profile endpoints (audited from
// src/app/api/owner-profile/route.ts). No new backend capability — this
// module only calls what's already there.
import { apiFetch } from "./api-client";
import { OwnerProfileItem, type OwnerProfileWrite } from "./contracts";

/** Returns null when the owner has no profile yet (backend 404), not an error. */
export async function getOwnerProfile(): Promise<OwnerProfileItem | null> {
  try {
    return await apiFetch("/api/owner-profile", { schema: OwnerProfileItem });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      err.status === 404
    ) {
      return null;
    }
    throw err;
  }
}

export async function createOwnerProfile(
  data: OwnerProfileWrite,
): Promise<OwnerProfileItem> {
  return apiFetch("/api/owner-profile", {
    method: "POST",
    body: JSON.stringify(data),
    schema: OwnerProfileItem,
  });
}

export async function updateOwnerProfile(
  data: OwnerProfileWrite,
): Promise<OwnerProfileItem> {
  return apiFetch("/api/owner-profile", {
    method: "PATCH",
    body: JSON.stringify(data),
    schema: OwnerProfileItem,
  });
}
