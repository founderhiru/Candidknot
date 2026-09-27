// @vitest-environment node
//
// End-to-end tests of the REAL auth configuration in @/lib/auth (real
// better-auth, real phoneNumber / magicLink / expo plugins, real HTTP handler)
// with only the edges replaced: Postgres -> better-auth's in-memory adapter,
// and the SMS/email senders -> spies. This is what proves the OTP and magic
// link flows work as configured, including session persistence and logout —
// unlike auth.test.ts, which mocks better-auth itself.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/env', () => ({
  env: {
    SESSION_SECRET: 'integration-test-secret-integration-test-secret',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    RESEND_API_KEY: 'test-resend-key',
    EMAIL_FROM: 'KINRO <test@example.com>',
    NEXT_PUBLIC_APP_URL: 'https://kinro.example.com',
    MOBILE_APP_SCHEME: 'canidknot://',
  },
}));

const sendOtpSms = vi.hoisted(() => vi.fn(async () => {}));
const sendAuthEmail = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/sms', () => ({ sendOtpSms }));
vi.mock('@/lib/email', () => ({ sendAuthEmail }));

const store = vi.hoisted(() => ({
  db: { user: [], session: [], account: [], verification: [] } as Record<string, unknown[]>,
}));
vi.mock('better-auth/adapters/prisma', async () => {
  const { memoryAdapter } = await vi.importActual<typeof import('better-auth/adapters/memory')>(
    'better-auth/adapters/memory',
  );
  return { prismaAdapter: () => memoryAdapter(store.db) };
});

// better-auth switches OFF origin/callback-URL validation (and rate limiting)
// when NODE_ENV === 'test' OR TEST=true (vitest sets both). Run as
// 'development' instead so the security checks this file asserts on —
// trusted origins, callback allow-listing — are the real ones. Must happen
// before @/lib/auth is first imported (in api()).
vi.stubEnv('NODE_ENV', 'development');
vi.stubEnv('TEST', 'false');

const BASE = 'https://kinro.example.com/api/auth';
const PHONE = '+919876543210';
// What @better-auth/expo's client sends: its own scheme as the Origin.
const MOBILE_ORIGIN = 'canidknot://';

async function api(
  method: 'GET' | 'POST',
  path: string,
  opts: { body?: unknown; cookie?: string; origin?: string } = {},
) {
  const { auth } = await import('@/lib/auth');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.origin) headers.origin = opts.origin;
  if (opts.cookie) headers.cookie = opts.cookie;
  return auth.handler(
    new Request(path.startsWith('http') ? path : `${BASE}${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
  );
}

/** "name=value" pair of the session token, from a Set-Cookie header (or a magic-link ?cookie= value). */
function sessionCookieFrom(setCookie: string | null | string[]): string {
  const raw = Array.isArray(setCookie) ? setCookie.join(', ') : (setCookie ?? '');
  const match = raw.match(/((?:__Secure-)?better-auth\.session_token=[^;,\s]+)/);
  if (!match?.[1]) throw new Error(`no session cookie in: ${raw}`);
  return match[1];
}

async function getSession(cookie?: string) {
  const res = await api('GET', '/get-session', { cookie });
  const text = await res.text();
  return text && text !== 'null' ? JSON.parse(text) : null;
}

function lastOtp(): string {
  const call = sendOtpSms.mock.calls.at(-1) as unknown as [string, string] | undefined;
  if (!call) throw new Error('no OTP was sent');
  return call[1];
}

beforeEach(() => {
  for (const rows of Object.values(store.db)) rows.length = 0;
  sendOtpSms.mockClear();
  sendAuthEmail.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('OTP sign-in (real @/lib/auth config)', () => {
  it('request: sends a 6-digit code to the E.164 number via the SMS seam', async () => {
    const res = await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    expect(res.status).toBe(200);
    expect(sendOtpSms).toHaveBeenCalledTimes(1);
    expect(sendOtpSms).toHaveBeenCalledWith(PHONE, expect.stringMatching(/^\d{6}$/));
  });

  it('rejects non-Indian or malformed numbers server-side and sends nothing (SMS-pumping guard)', async () => {
    for (const phoneNumber of ['+14155550123', '9876543210', '+911234567890', '+91 98765 43210']) {
      const res = await api('POST', '/phone-number/send-otp', {
        body: { phoneNumber },
        origin: MOBILE_ORIGIN,
      });
      expect(res.status, phoneNumber).toBe(400);
      expect((await res.json()).code).toBe('INVALID_PHONE_NUMBER');
    }
    expect(sendOtpSms).not.toHaveBeenCalled();
  });

  it('a delivery failure surfaces as an error instead of pretending the code was sent', async () => {
    sendOtpSms.mockRejectedValueOnce(new Error('SMS_PROVIDER is not configured'));
    const res = await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    expect(res.ok).toBe(false);
  });

  it('verify: correct code creates the user and a session that persists across requests', async () => {
    await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    const res = await api('POST', '/phone-number/verify', {
      body: { phoneNumber: PHONE, code: lastOtp() },
      origin: MOBILE_ORIGIN,
    });
    expect(res.status).toBe(200);
    const cookie = sessionCookieFrom(res.headers.getSetCookie());

    // Session persistence: the stored cookie alone re-establishes the session,
    // repeatedly (this is what the mobile app replays from SecureStore).
    const first = await getSession(cookie);
    const second = await getSession(cookie);
    expect(first?.user?.phoneNumber).toBe(PHONE);
    expect(second?.user?.id).toBe(first?.user?.id);
  });

  it('invalid OTP -> INVALID_OTP, and no session is created', async () => {
    await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    const wrong = lastOtp() === '000000' ? '111111' : '000000';
    const res = await api('POST', '/phone-number/verify', {
      body: { phoneNumber: PHONE, code: wrong },
      origin: MOBILE_ORIGIN,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_OTP');
    expect(res.headers.getSetCookie()).toHaveLength(0);
    expect(store.db.session).toHaveLength(0);
  });

  it('no code requested -> OTP_NOT_FOUND', async () => {
    const res = await api('POST', '/phone-number/verify', {
      body: { phoneNumber: PHONE, code: '123456' },
      origin: MOBILE_ORIGIN,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('OTP_NOT_FOUND');
  });

  it('expired OTP (after 10 minutes) -> OTP_EXPIRED', async () => {
    await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    const code = lastOtp();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    const res = await api('POST', '/phone-number/verify', {
      body: { phoneNumber: PHONE, code },
      origin: MOBILE_ORIGIN,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('OTP_EXPIRED');
  });

  it('too many wrong attempts locks the code (TOO_MANY_ATTEMPTS), even for the right code', async () => {
    await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    const right = lastOtp();
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await api('POST', '/phone-number/verify', {
        body: { phoneNumber: PHONE, code: wrong },
        origin: MOBILE_ORIGIN,
      });
    }
    const res = await api('POST', '/phone-number/verify', {
      body: { phoneNumber: PHONE, code: right },
      origin: MOBILE_ORIGIN,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await res.json()).code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('resend: a fresh code is issued and it signs the user in', async () => {
    await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    expect(sendOtpSms).toHaveBeenCalledTimes(2);
    const res = await api('POST', '/phone-number/verify', {
      body: { phoneNumber: PHONE, code: lastOtp() },
      origin: MOBILE_ORIGIN,
    });
    expect(res.status).toBe(200);
  });

  it('logout: sign-out revokes the session server-side, so the stored cookie stops working', async () => {
    await api('POST', '/phone-number/send-otp', {
      body: { phoneNumber: PHONE },
      origin: MOBILE_ORIGIN,
    });
    const verified = await api('POST', '/phone-number/verify', {
      body: { phoneNumber: PHONE, code: lastOtp() },
      origin: MOBILE_ORIGIN,
    });
    const cookie = sessionCookieFrom(verified.headers.getSetCookie());
    expect(await getSession(cookie)).not.toBeNull();

    const out = await api('POST', '/sign-out', { body: {}, cookie, origin: MOBILE_ORIGIN });
    expect(out.status).toBe(200);

    expect(await getSession(cookie)).toBeNull();
    expect(store.db.session).toHaveLength(0);
  });
});

describe('Magic link sign-in (real @/lib/auth config)', () => {
  const EMAIL = 'owner@example.com';

  async function requestLink(extra: Record<string, string> = {}) {
    const res = await api('POST', '/sign-in/magic-link', {
      body: {
        email: EMAIL,
        callbackURL: 'canidknot:///',
        errorCallbackURL: 'canidknot:///email-link',
        ...extra,
      },
      origin: MOBILE_ORIGIN,
    });
    const call = sendAuthEmail.mock.calls.at(-1) as unknown as
      | [string, string, string, string]
      | undefined;
    return { res, call };
  }

  it('request: emails a public https link (never localhost) with a tappable HTML button', async () => {
    const { res, call } = await requestLink();
    expect(res.status).toBe(200);
    if (!call) throw new Error('no email sent');
    const [to, subject, text, html] = call;
    expect(to).toBe(EMAIL);
    expect(subject).toBe('Your KINRO sign-in link');
    const url = text.match(/https:\/\/\S+/)?.[0];
    expect(url).toMatch(/^https:\/\/kinro\.example\.com\/api\/auth\/magic-link\/verify\?token=/);
    expect(html).toContain('href="https://kinro.example.com/api/auth/magic-link/verify?token=');
  });

  it('callback: opening the link signs in and redirects into the app with the session cookie', async () => {
    const { call } = await requestLink();
    const link = (call?.[2] ?? '').match(/https:\/\/\S+/)?.[0] as string;

    // A browser following the emailed link: plain GET, no Origin header.
    const res = await api('GET', link);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location') as string);
    expect(location.protocol).toBe('canidknot:');
    expect(location.pathname).toBe('/'); // canidknot:/// — the app root (app/index.tsx)
    expect(location.searchParams.get('error')).toBeNull();

    // Session handling: the cookie in the deep link is a working session.
    const cookie = sessionCookieFrom(location.searchParams.get('cookie'));
    const session = await getSession(cookie);
    expect(session?.user?.email).toBe(EMAIL);
    expect(session?.user?.emailVerified).toBe(true);
  });

  it('a link works exactly once: reopening it lands on the email screen with INVALID_TOKEN', async () => {
    const { call } = await requestLink();
    const link = (call?.[2] ?? '').match(/https:\/\/\S+/)?.[0] as string;
    expect((await api('GET', link)).status).toBe(302);

    const replay = await api('GET', link);
    expect(replay.status).toBe(302);
    const location = new URL(replay.headers.get('location') as string);
    expect(location.pathname).toBe('/email-link');
    expect(location.searchParams.get('error')).toBe('INVALID_TOKEN');
    expect(location.searchParams.get('cookie')).toBeNull(); // never a session on failure
  });

  it('an expired link (after 10 minutes) is rejected the same way', async () => {
    const { call } = await requestLink();
    const link = (call?.[2] ?? '').match(/https:\/\/\S+/)?.[0] as string;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);

    const res = await api('GET', link);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location') as string);
    expect(location.pathname).toBe('/email-link');
    expect(location.searchParams.get('error')).toBe('INVALID_TOKEN');
    expect(store.db.session).toHaveLength(0);
  });

  it('a garbage token is rejected without creating a session', async () => {
    const res = await api(
      'GET',
      `${BASE}/magic-link/verify?token=nope&callbackURL=${encodeURIComponent('canidknot:///')}&errorCallbackURL=${encodeURIComponent('canidknot:///email-link')}`,
    );
    expect(new URL(res.headers.get('location') as string).searchParams.get('error')).toBe(
      'INVALID_TOKEN',
    );
    expect(store.db.session).toHaveLength(0);
  });

  it('refuses to redirect a session to an untrusted callback URL', async () => {
    const { res } = await requestLink({ callbackURL: 'https://evil.example.com/steal' });
    expect(res.status).toBe(403);
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });

  it('refuses requests from an untrusted Origin', async () => {
    const res = await api('POST', '/sign-in/magic-link', {
      body: { email: EMAIL, callbackURL: 'canidknot:///' },
      origin: 'https://evil.example.com',
    });
    expect(res.status).toBe(403);
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });

  it('logout after a magic-link sign-in revokes the session', async () => {
    const { call } = await requestLink();
    const link = (call?.[2] ?? '').match(/https:\/\/\S+/)?.[0] as string;
    const location = new URL((await api('GET', link)).headers.get('location') as string);
    const cookie = sessionCookieFrom(location.searchParams.get('cookie'));
    expect(await getSession(cookie)).not.toBeNull();

    await api('POST', '/sign-out', { body: {}, cookie, origin: MOBILE_ORIGIN });
    expect(await getSession(cookie)).toBeNull();
  });
});
