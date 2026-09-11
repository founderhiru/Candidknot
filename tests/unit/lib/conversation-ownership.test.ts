// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const findUniqueMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { conversation: { findUnique: findUniqueMock } },
}));

const USER_A = 'user_a';
const USER_B = 'user_b';
const USER_C = 'user_c'; // not a participant

function activeConversation() {
  return {
    id: 'conv_1',
    matchId: 'match_1',
    match: {
      id: 'match_1',
      senderId: USER_A,
      receiverId: USER_B,
      status: 'active',
      sender: { id: USER_A, name: 'A' },
      receiver: { id: USER_B, name: 'B' },
      targetDog: { id: 'dog_1', name: 'Bruno' },
    },
  };
}

beforeEach(() => {
  findUniqueMock.mockReset();
});

describe('loadOwnedConversation', () => {
  it('returns the conversation for either participant', async () => {
    findUniqueMock.mockResolvedValue(activeConversation());
    const { loadOwnedConversation } = await import('@/lib/conversation-ownership');

    await expect(loadOwnedConversation('conv_1', USER_A)).resolves.toMatchObject({
      id: 'conv_1',
    });
    await expect(loadOwnedConversation('conv_1', USER_B)).resolves.toMatchObject({
      id: 'conv_1',
    });
  });

  it('throws (404) for a nonexistent conversation', async () => {
    findUniqueMock.mockResolvedValue(null);
    const { loadOwnedConversation, ConversationAccessError } = await import(
      '@/lib/conversation-ownership'
    );

    await expect(loadOwnedConversation('does_not_exist', USER_A)).rejects.toBeInstanceOf(
      ConversationAccessError,
    );
  });

  it('throws (404) — never leaks existence — for a non-participant', async () => {
    findUniqueMock.mockResolvedValue(activeConversation());
    const { loadOwnedConversation, ConversationAccessError } = await import(
      '@/lib/conversation-ownership'
    );

    const err = await loadOwnedConversation('conv_1', USER_C).catch((e) => e);
    expect(err).toBeInstanceOf(ConversationAccessError);
    expect((err as InstanceType<typeof ConversationAccessError>).status).toBe(404);
  });

  it('throws (404) for a participant whose Match is no longer active', async () => {
    const conversation = activeConversation();
    conversation.match.status = 'ended';
    findUniqueMock.mockResolvedValue(conversation);
    const { loadOwnedConversation, ConversationAccessError } = await import(
      '@/lib/conversation-ownership'
    );

    await expect(loadOwnedConversation('conv_1', USER_A)).rejects.toBeInstanceOf(
      ConversationAccessError,
    );
  });
});
