// @polsia:user-owned — server-only SMS abstraction (Phase 2).
//
// Deliberately vendor-agnostic: no SMS vendor SDK is installed or imported
// here. India-capable transactional SMS/OTP providers (e.g. MSG91, Twilio
// Verify, Kaleyra, Gupshup) can be wired in later by implementing
// SmsProvider and switching the `provider` export — nothing in
// @/lib/auth's phoneNumber plugin config needs to change when that happens.
//
// Until SMS_PROVIDER is set, sendSms logs to the server console instead of
// throwing, so local development and this phase's build/typecheck/tests
// don't require a real SMS account. It DOES throw in production if left
// unconfigured, so a real vendor is a required decision before phone
// sign-in can work for real users — never silently "succeeds" in prod.
import 'server-only';

export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

const consoleProvider: SmsProvider = {
  async send(to, body) {
    // biome-ignore lint/suspicious/noConsole: dev-only stand-in until a real SMS vendor is chosen.
    console.log(`[sms:dev] to=${to} body=${body}`);
  },
};

function resolveProvider(): SmsProvider {
  const configured = process.env.SMS_PROVIDER;
  if (!configured || configured === 'console') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SMS_PROVIDER is not configured. Phone sign-in cannot send real OTPs in production until an SMS vendor is chosen and implemented here.',
      );
    }
    return consoleProvider;
  }
  // Future vendors register here, e.g.:
  //   if (configured === 'msg91') return msg91Provider;
  throw new Error(`Unknown SMS_PROVIDER "${configured}" — no implementation registered.`);
}

export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  const provider = resolveProvider();
  await provider.send(
    phoneNumber,
    `${code} is your CanidKnot verification code. It expires shortly.`,
  );
}
