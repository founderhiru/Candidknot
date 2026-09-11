import { describe, expect, it } from 'vitest';
import { getPaymentProvider, PaymentProviderNotConfiguredError } from '@/lib/payments/provider';

describe('getPaymentProvider (NullPaymentProvider)', () => {
  it('createOrder throws PaymentProviderNotConfiguredError rather than returning a fake order', async () => {
    const provider = getPaymentProvider();

    await expect(
      provider.createOrder({ userId: 'user_a', service: 'connection_messaging', scopeId: null }),
    ).rejects.toBeInstanceOf(PaymentProviderNotConfiguredError);
  });

  it('verifyPayment throws PaymentProviderNotConfiguredError rather than reporting success', async () => {
    const provider = getPaymentProvider();

    await expect(
      provider.verifyPayment({ orderId: 'order_1', signature: 'sig' }),
    ).rejects.toBeInstanceOf(PaymentProviderNotConfiguredError);
  });
});
