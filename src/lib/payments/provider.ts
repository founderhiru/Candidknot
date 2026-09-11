// @polsia:user-owned — Launch MVP Phase C: the ONLY place that would ever
// talk to a real payment provider. No provider is configured — no
// credentials exist anywhere in this codebase, and none are invented
// here (see the launch MVP scope: "do not hardcode payment credentials").
//
// A future Razorpay (or other India-first provider) adapter implements
// this same PaymentProvider interface and gets returned from
// getPaymentProvider() based on environment configuration — no route or
// the Entitlement model needs to change when that happens.
export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  /** Creates a payable order for `service`/`scopeId`. */
  createOrder(params: {
    userId: string;
    service: string;
    scopeId: string | null;
  }): Promise<PaymentOrder>;
  /** Verifies a provider webhook/callback and reports whether payment succeeded. */
  verifyPayment(params: { orderId: string; signature: string }): Promise<boolean>;
}

export class PaymentProviderNotConfiguredError extends Error {
  constructor() {
    super('Payment provider not configured yet');
  }
}

/**
 * No-op provider used until a real one is wired up. Every method throws
 * PaymentProviderNotConfiguredError — callers must surface that plainly
 * rather than fabricating a successful purchase (see the launch MVP
 * scope: "do not fake successful payments").
 */
class NullPaymentProvider implements PaymentProvider {
  async createOrder(): Promise<PaymentOrder> {
    throw new PaymentProviderNotConfiguredError();
  }

  async verifyPayment(): Promise<boolean> {
    throw new PaymentProviderNotConfiguredError();
  }
}

/** Returns the active PaymentProvider. Always NullPaymentProvider today. */
export function getPaymentProvider(): PaymentProvider {
  return new NullPaymentProvider();
}
