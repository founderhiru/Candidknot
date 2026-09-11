// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const createMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { notificationEvent: { create: createMock } },
}));

beforeEach(() => {
  createMock.mockReset();
});

describe('emitNotification', () => {
  it('creates a NotificationEvent row with a JSON-encoded payload', async () => {
    createMock.mockResolvedValue({ id: 'evt_1' });
    const { emitNotification } = await import('@/lib/notifications');

    await emitNotification('user_a', 'interest_received', { interestId: 'i1' });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: 'user_a',
        type: 'interest_received',
        payload: JSON.stringify({ interestId: 'i1' }),
      },
    });
  });

  it('never throws when the underlying write fails — a notification-log failure must never break the caller', async () => {
    createMock.mockRejectedValue(new Error('db unavailable'));
    const { emitNotification } = await import('@/lib/notifications');

    await expect(
      emitNotification('user_a', 'message_received', { conversationId: 'c1' }),
    ).resolves.toBeUndefined();
  });
});
