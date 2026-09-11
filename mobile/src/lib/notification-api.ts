// Mobile (Launch MVP Phase D) — thin, typed wrapper around the EXISTING
// GET /api/notifications endpoint (audited from
// src/app/api/notifications/route.ts).
import { apiFetch } from "./api-client";
import { NotificationEventList } from "./notification-contracts";

export async function listNotifications(): Promise<NotificationEventList> {
  return apiFetch("/api/notifications", { schema: NotificationEventList });
}
