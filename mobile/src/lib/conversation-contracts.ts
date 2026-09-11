// Mobile — client-side mirror of the backend's Conversation/Message
// contract (src/lib/contracts/conversations.ts). Not a new API — describes
// the exact shapes the existing /api/conversations* routes already return.
import { z } from "zod";

export const MESSAGE_MAX_LENGTH = 2000;

// Deliberately has NO senderId/conversationId field — the conversation
// comes from the URL (already ownership-checked server-side) and the
// sender is always derived from the session.
export const MessageWrite = z.object({
  body: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});
export type MessageWrite = z.infer<typeof MessageWrite>;

export const MessageItem = z.object({
  id: z.string(),
  body: z.string(),
  senderId: z.string(),
  isMine: z.boolean(),
  createdAt: z.string(),
});
export type MessageItem = z.infer<typeof MessageItem>;

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
export const ConversationList = z.object({
  items: z.array(ConversationSummary),
});
export type ConversationList = z.infer<typeof ConversationList>;

export const ConversationDetail = z.object({
  id: z.string(),
  matchId: z.string(),
  targetDogId: z.string(),
  targetDogName: z.string(),
  otherUserName: z.string().nullable(),
  messages: z.array(MessageItem),
});
export type ConversationDetail = z.infer<typeof ConversationDetail>;
