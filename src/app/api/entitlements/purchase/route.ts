// @polsia:user-owned — Launch MVP Phase C: the purchase entrypoint. No
// payment provider is configured (see src/lib/payments/provider.ts), so
// this always responds 501 — it never grants an Entitlement itself and
// never fakes a successful payment (see the launch MVP scope). A real
// provider integration later creates the order via getPaymentProvider()
// here and grants the Entitlement from its own verified webhook/callback,
// not from this handler succeeding.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { PurchaseRequest } from '@/lib/contracts/entitlements';
import { getPaymentProvider, PaymentProviderNotConfiguredError } from '@/lib/payments/provider';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const parsed = PurchaseRequest.safeParse(await request.json());
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

    const provider = getPaymentProvider();
    // Always throws today (NullPaymentProvider) — kept as a real call
    // rather than an early return so a configured provider's success
    // path has somewhere to continue from (creating the order and
    // returning its details to the client to complete checkout).
    await provider.createOrder({
      userId: user.id,
      service: parsed.data.service,
      scopeId: parsed.data.scopeId ?? null,
    });

    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof PaymentProviderNotConfiguredError) {
      return NextResponse.json(
        { error: 'Payment provider not configured yet', requiresPurchase: true },
        { status: 501 },
      );
    }
    return NextResponse.json({ error: 'Unable to start purchase' }, { status: 500 });
  }
}
