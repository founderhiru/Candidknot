// @polsia:user-owned — Launch MVP Phase B: the one place that decides
// whether a caller may see/use a conversation. Every conversation and
// message route goes through this — never re-implement the check inline.
//
// A conversation is usable only by the two users on its Match, and only
// while that Match is "active" (the only status Match rows have today —
// nothing transitions it away from "active" yet, but the check is kept
// here so a future "unmatch" feature only needs to change Match.status,
// not touch every conversation/message route). A conversation with no
// matching row, one the caller isn't a participant of, and one whose
// Match isn't active all return the exact same 404 — never leaking which
// case it was.
import 'server-only';

import { prisma } from '@/lib/db';

export class ConversationAccessError extends Error {
  readonly status = 404;
}

export type OwnedConversation = NonNullable<Awaited<ReturnType<typeof loadConversationWithMatch>>>;

function loadConversationWithMatch(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: { include: { sender: true, receiver: true, targetDog: true } },
    },
  });
}

/** Loads a conversation the given user is a participant of, or throws ConversationAccessError (404). */
export async function loadOwnedConversation(
  conversationId: string,
  userId: string,
): Promise<OwnedConversation> {
  const conversation = await loadConversationWithMatch(conversationId);

  const isParticipant =
    !!conversation &&
    (conversation.match.senderId === userId || conversation.match.receiverId === userId);

  if (!conversation || !isParticipant || conversation.match.status !== 'active') {
    throw new ConversationAccessError('Conversation not found');
  }

  return conversation;
}
