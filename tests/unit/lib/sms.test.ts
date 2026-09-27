// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createMsg91Provider, sendOtpSms } from '@/lib/sms';

const CONFIG = { authKey: 'secret-auth-key', templateId: 'tmpl_123' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('MSG91 provider', () => {
  it('sends better-auth’s OTP through MSG91’s template API', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ type: 'success', message: 'req-id' }));
    const provider = createMsg91Provider(CONFIG, fetchMock as unknown as typeof fetch);

    await provider.sendOtp('+919876543210', '482913');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe('https://control.msg91.com/api/v5/otp');
    expect(url.searchParams.get('template_id')).toBe('tmpl_123');
    // Country code, no "+".
    expect(url.searchParams.get('mobile')).toBe('919876543210');
    // The code better-auth generated — MSG91 only delivers it.
    expect(url.searchParams.get('otp')).toBe('482913');
    expect(url.searchParams.get('otp_expiry')).toBe('10');
    expect(init.method).toBe('POST');
  });

  it('keeps the auth key out of the URL (it would land in access logs)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ type: 'success' }));
    const provider = createMsg91Provider(CONFIG, fetchMock as unknown as typeof fetch);
    await provider.sendOtp('+919876543210', '111111');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).not.toContain('secret-auth-key');
    expect((init.headers as Record<string, string>).authkey).toBe('secret-auth-key');
  });

  it('throws when MSG91 reports an error, without leaking the OTP or key', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ type: 'error', message: 'Template not approved' }),
    );
    const provider = createMsg91Provider(CONFIG, fetchMock as unknown as typeof fetch);
    const failure = provider.sendOtp('+919876543210', '482913');
    await expect(failure).rejects.toThrow(/Template not approved/);
    await expect(failure).rejects.not.toThrow(/482913|secret-auth-key/);
  });

  it('throws on a non-2xx response', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, 401));
    const provider = createMsg91Provider(CONFIG, fetchMock as unknown as typeof fetch);
    await expect(provider.sendOtp('+919876543210', '482913')).rejects.toThrow(/HTTP 401/);
  });

  it('throws when the network request itself fails', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const provider = createMsg91Provider(CONFIG, fetchMock as unknown as typeof fetch);
    await expect(provider.sendOtp('+919876543210', '482913')).rejects.toThrow(/network\/timeout/);
  });
});

describe('sendOtpSms provider selection', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('development with no provider: logs to the console instead of sending', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SMS_PROVIDER', '');
    await sendOtpSms('+919876543210', '123456');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[sms:dev]'));
  });

  it('production with no provider: refuses, so a missing config can never look like a working sign-in', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMS_PROVIDER', '');
    await expect(sendOtpSms('+919876543210', '123456')).rejects.toThrow(
      /SMS_PROVIDER is not configured/,
    );
  });

  it('production with SMS_PROVIDER=console: also refused', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMS_PROVIDER', 'console');
    await expect(sendOtpSms('+919876543210', '123456')).rejects.toThrow(/not configured/);
  });

  it('msg91 without credentials: names exactly what is missing', async () => {
    vi.stubEnv('SMS_PROVIDER', 'msg91');
    vi.stubEnv('MSG91_AUTH_KEY', '');
    vi.stubEnv('MSG91_OTP_TEMPLATE_ID', '');
    await expect(sendOtpSms('+919876543210', '123456')).rejects.toThrow(
      /MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID/,
    );
  });

  it('msg91 with credentials: delivers through MSG91 (and only then)', async () => {
    vi.stubEnv('SMS_PROVIDER', 'MSG91'); // case-insensitive
    vi.stubEnv('MSG91_AUTH_KEY', 'k');
    vi.stubEnv('MSG91_OTP_TEMPLATE_ID', 't');
    const fetchMock = vi.fn(async () => jsonResponse({ type: 'success' }));
    vi.stubGlobal('fetch', fetchMock);

    await sendOtpSms('+919876543210', '654321');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.get('otp')).toBe('654321');
  });

  it('logs a delivery failure server-side (Render logs) and rethrows', async () => {
    vi.stubEnv('SMS_PROVIDER', 'msg91');
    vi.stubEnv('MSG91_AUTH_KEY', 'k');
    vi.stubEnv('MSG91_OTP_TEMPLATE_ID', 't');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ type: 'error', message: 'Invalid authkey' })),
    );
    await expect(sendOtpSms('+919876543210', '654321')).rejects.toThrow(/Invalid authkey/);
    expect(errorSpy).toHaveBeenCalledWith(
      '[sms] OTP delivery failed:',
      expect.stringContaining('Invalid authkey'),
    );
  });

  it('an unknown provider name is an error, not a silent fallback', async () => {
    vi.stubEnv('SMS_PROVIDER', 'carrier-pigeon');
    await expect(sendOtpSms('+919876543210', '123456')).rejects.toThrow(/Unknown SMS_PROVIDER/);
  });
});
