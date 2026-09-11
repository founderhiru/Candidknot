// @polsia:user-owned — Launch MVP Phase B: send a message. senderId is
// always requireAuthenticatedUser().id — never a client-supplied value.
// Eligibility (participant membership + accepted Match) is entirely
// delegated to loadOwnedConversation, so there is exactly one place that
// decides who may message whom.
//
// Phase C addendum: past FREE_MESSAGE_LIMIT messages, sending requires an
// active Entitlement — see src/lib/entitlements.ts. Nothing here can
// grant one; that only ever happens via a verified payment provider
// callback, and none is configured today (see
// src/app/api/entitlements/purchase/route.ts).
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { MessageWrite, toMessageItem } from '@/lib/contracts/conversations';
import { ConversationAccessError, loadOwnedConversation } from '@/lib/conversation-ownership';
import { prisma } from '@/lib/db';
import {
  CONNECTION_MESSAGING_SERVICE,
  FREE_MESSAGE_LIMIT,
  hasActiveEntitlement,
} from '@/lib/entitlements';
import { emitNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await params;

    // Also rejects an unmatched/inactive conversation — see
    // conversation-ownership.ts. There is no separate "is this an
    // accepted Match" check here; a Conversation only ever exists
    // alongside an active Match (created together, atomically, in
    // interests/[id]/route.ts), so this one check covers both.
    const conversation = await loadOwnedConversation(id, user.id);

    const parsed = MessageWrite.safeParse(await request.json());
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errors: Record<string, string> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const message = messages?.[0];
        if (message) {
          errors[field] = message;
        }
      }
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Phase C: the MVP's only paywall. The conversation gets a short
    // free trial (FREE_MESSAGE_LIMIT total messages, either side) before
    // continuing requires an active entitlement — see
    // src/lib/entitlements.ts. Checked AFTER validating the body so a
    // malformed request never gets a misleading "you need to pay" error.
    const sentCount = await prisma.message.count({ where: { conversationId: conversation.id } });
    if (sentCount >= FREE_MESSAGE_LIMIT) {
      const entitled = await hasActiveEntitlement(
        user.id,
        CONNECTION_MESSAGING_SERVICE,
        conversation.id,
      );
      if (!entitled) {
        return NextResponse.json(
          {
            error: "You're matched! Messaging is available with a Connection service.",
            requiresPurchase: true,
          },
          { status: 402 },
        );
      }
    }

    const created = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: user.id, body: parsed.data.body },
    });

    // Keeps GET /api/conversations sorted by most-recently-active first.
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const otherUserId =
      conversation.match.senderId === user.id
        ? conversation.match.receiverId
        : conversation.match.senderId;
    await emitNotification(otherUserId, 'message_received', {
      conversationId: conversation.id,
      messageId: created.id,
    });

    return NextResponse.json(toMessageItem(created, user.id), { status: 201 });
  } catch (err) {
    if (err instanceof ConversationAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to send message' }, { status: 500 });
  }
}
