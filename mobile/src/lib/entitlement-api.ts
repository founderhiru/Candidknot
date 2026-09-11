// Mobile (Launch MVP Phase C) — thin, typed wrappers around the EXISTING
// /api/entitlements/* endpoints (audited from src/app/api/entitlements/**).
// purchaseEntitlement always rejects today (501, no provider configured)
// — callers must surface that plainly rather than treating it as success.
import { apiFetch } from "./api-client";
import { EntitlementCheckResponse } from "./entitlement-contracts";

export async function checkEntitlement(
  service: string,
  scopeId?: string,
): Promise<EntitlementCheckResponse> {
  const params = new URLSearchParams({ service });
  if (scopeId) params.set("scopeId", scopeId);
  return apiFetch(`/api/entitlements/check?${params.toString()}`, {
    schema: EntitlementCheckResponse,
  });
}

/** Always rejects today (no payment provider configured) — never resolves with a fake success. */
export async function purchaseEntitlement(
  service: string,
  scopeId?: string,
): Promise<void> {
  await apiFetch<void>("/api/entitlements/purchase", {
    method: "POST",
    body: JSON.stringify({ service, scopeId: scopeId ?? null }),
  });
}
