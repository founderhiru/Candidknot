// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const findFirstMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { entitlement: { findFirst: findFirstMock } },
}));

beforeEach(() => {
  findFirstMock.mockReset();
});

describe('hasActiveEntitlement', () => {
  it('returns false when no matching row exists', async () => {
    findFirstMock.mockResolvedValue(null);
    const { hasActiveEntitlement } = await import('@/lib/entitlements');

    await expect(hasActiveEntitlement('user_a', 'connection_messaging', 'conv_1')).resolves.toBe(
      false,
    );
  });

  it('returns true for an active, non-expiring row', async () => {
    findFirstMock.mockResolvedValue({ id: 'ent_1', status: 'active', expiresAt: null });
    const { hasActiveEntitlement } = await import('@/lib/entitlements');

    await expect(hasActiveEntitlement('user_a', 'connection_messaging', 'conv_1')).resolves.toBe(
      true,
    );
  });

  it('scopes the query to userId, service, scopeId, active status, and unexpired', async () => {
    findFirstMock.mockResolvedValue(null);
    const { hasActiveEntitlement } = await import('@/lib/entitlements');

    await hasActiveEntitlement('user_a', 'connection_messaging', 'conv_1');

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user_a',
          service: 'connection_messaging',
          scopeId: 'conv_1',
          status: 'active',
        }),
      }),
    );
  });

  it('defaults scopeId to null for account-wide entitlements', async () => {
    findFirstMock.mockResolvedValue(null);
    const { hasActiveEntitlement } = await import('@/lib/entitlements');

    await hasActiveEntitlement('user_a', 'some_service');

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ scopeId: null }) }),
    );
  });
});
