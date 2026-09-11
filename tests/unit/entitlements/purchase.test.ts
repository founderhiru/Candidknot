// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

class FakeAuthError extends Error {
  readonly status = 401;
}
const requireAuthenticatedUserMock = vi.fn();
vi.mock('@/lib/auth', () => ({
  AuthError: FakeAuthError,
  requireAuthenticatedUser: requireAuthenticatedUserMock,
}));

const createOrderMock = vi.fn();
class FakePaymentProviderNotConfiguredError extends Error {}
vi.mock('@/lib/payments/provider', () => ({
  PaymentProviderNotConfiguredError: FakePaymentProviderNotConfiguredError,
  getPaymentProvider: () => ({ createOrder: createOrderMock }),
}));

const USER_A = { id: 'user_a' };

function jsonRequest(body: unknown) {
  return new Request('http://test/api/entitlements/purchase', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireAuthenticatedUserMock.mockReset();
  createOrderMock.mockReset();
});

describe('POST /api/entitlements/purchase', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireAuthenticatedUserMock.mockRejectedValue(new FakeAuthError('Authentication required'));
    const { POST } = await import('@/app/api/entitlements/purchase/route');

    const res = await POST(jsonRequest({ service: 'connection_messaging' }));

    expect(res.status).toBe(401);
  });

  it('rejects a missing service with 400', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    const { POST } = await import('@/app/api/entitlements/purchase/route');

    const res = await POST(jsonRequest({}));

    expect(res.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('returns 501 with requiresPurchase — never a fake success — when no provider is configured', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    createOrderMock.mockRejectedValue(new FakePaymentProviderNotConfiguredError());
    const { POST } = await import('@/app/api/entitlements/purchase/route');

    const res = await POST(jsonRequest({ service: 'connection_messaging', scopeId: 'conv_1' }));
    const body = await res.json();

    expect(res.status).toBe(501);
    expect(body.requiresPurchase).toBe(true);
  });

  it('passes the authenticated userId to the provider, not a client-supplied one', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(USER_A);
    createOrderMock.mockRejectedValue(new FakePaymentProviderNotConfiguredError());
    const { POST } = await import('@/app/api/entitlements/purchase/route');

    await POST(
      jsonRequest({ service: 'connection_messaging', scopeId: 'conv_1', userId: 'someone_else' }),
    );

    expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_A.id }));
  });
});
