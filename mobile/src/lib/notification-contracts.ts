// Mobile — client-side mirror of the backend's notification contract
// (src/lib/contracts/notifications.ts). Not a new API — describes the
// exact shape GET /api/notifications already returns.
import { z } from "zod";

export const NotificationEventItem = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  payload: z.record(z.unknown()),
  read: z.boolean(),
  createdAt: z.string(),
});
export type NotificationEventItem = z.infer<typeof NotificationEventItem>;

export const NotificationEventList = z.object({
  items: z.array(NotificationEventItem),
});
export type NotificationEventList = z.infer<typeof NotificationEventList>;
