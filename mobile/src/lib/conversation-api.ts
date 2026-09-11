// Mobile (Launch MVP Phase B) — thin, typed wrappers around the EXISTING
// /api/conversations* endpoints (audited from src/app/api/conversations/**).
// No business logic here — participant/Match eligibility is entirely
// server-side (loadOwnedConversation); this only sends requests and
// surfaces whatever the backend returns (including its 404 for an
// unmatched/nonexistent conversation) via ApiError.
import { apiFetch } from "./api-client";
import {
  ConversationDetail,
  ConversationList,
  MessageItem,
  type MessageWrite,
} from "./conversation-contracts";

export async function listConversations(): Promise<ConversationList> {
  return apiFetch("/api/conversations", { schema: ConversationList });
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationDetail> {
  return apiFetch(`/api/conversations/${conversationId}`, {
    schema: ConversationDetail,
  });
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<MessageItem> {
  const payload: MessageWrite = { body };
  return apiFetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
    schema: MessageItem,
  });
}
