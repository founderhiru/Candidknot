// @polsia:user-owned — client-safe contract for Launch MVP Phase B
// (Messaging). Keep free of Prisma/server-only imports.
import { z } from 'zod';

export const MESSAGE_MAX_LENGTH = 2000;

// Write shape: the only thing an authenticated participant may submit.
// Deliberately has NO senderId/conversationId field — the conversation
// comes from the URL (already ownership-checked) and the sender is
// always derived from the session.
export const MessageWrite = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(MESSAGE_MAX_LENGTH, 'Message is too long'),
});
export type MessageWrite = z.infer<typeof MessageWrite>;

export const MessageItem = z.object({
  id: z.string(),
  body: z.string(),
  senderId: z.string(),
  // Precomputed server-side against the viewer's session id, so mobile
  // never has to know or compare user ids to render sent-vs-received.
  isMine: z.boolean(),
  createdAt: z.string(),
});
export type MessageItem = z.infer<typeof MessageItem>;

// GET /api/conversations — one row per conversation the caller is in.
export const ConversationSummary = z.object({
  id: z.string(),
  matchId: z.string(),
  targetDogId: z.string(),
  targetDogName: z.string(),
  otherUserName: z.string().nullable(),
  lastMessageBody: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  updatedAt: z.string(),
});
export type ConversationSummary = z.infer<typeof ConversationSummary>;
export const ConversationList = z.object({ items: z.array(ConversationSummary) });
export type ConversationList = z.infer<typeof ConversationList>;

// GET /api/conversations/[id] — messages in chronological (oldest first)
// order, ready to render top-to-bottom.
export const ConversationDetail = z.object({
  id: z.string(),
  matchId: z.string(),
  targetDogId: z.string(),
  targetDogName: z.string(),
  otherUserName: z.string().nullable(),
  messages: z.array(MessageItem),
});
export type ConversationDetail = z.infer<typeof ConversationDetail>;

// Shape of a Prisma Message row — kept structural (no Prisma import) so
// this stays a client-importable module.
type MessageRow = {
  id: string;
  body: string;
  senderId: string;
  createdAt: Date;
};

/** Converts a Prisma Message row into the wire shape, from `viewerId`'s point of view. */
export function toMessageItem(row: MessageRow, viewerId: string): MessageItem {
  return MessageItem.parse({
    id: row.id,
    body: row.body,
    senderId: row.senderId,
    isMine: row.senderId === viewerId,
    createdAt: row.createdAt.toISOString(),
  });
}
