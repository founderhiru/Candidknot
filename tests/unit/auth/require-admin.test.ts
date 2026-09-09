// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/env', () => ({
  env: {
    SESSION_SECRET: 'test-secret-test-secret-test-secret',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    RESEND_API_KEY: 'test-resend-key',
    EMAIL_FROM: 'CanidKnot <test@example.com>',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));
vi.mock('@/lib/email', () => ({ sendAuthEmail: vi.fn() }));
vi.mock('@/lib/sms', () => ({ sendOtpSms: vi.fn() }));

const getSessionMock = vi.fn();
vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    api: { getSession: getSessionMock },
    $Infer: { Session: undefined },
  })),
}));
vi.mock('better-auth/adapters/prisma', () => ({ prismaAdapter: vi.fn(() => ({})) }));
vi.mock('better-auth/plugins', () => ({
  magicLink: vi.fn((options: unknown) => options),
  phoneNumber: vi.fn((options: unknown) => options),
}));

describe('requireAdmin', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
  });

  it('rejects an unauthenticated caller', async () => {
    getSessionMock.mockResolvedValue(null);
    const { requireAdmin } = await import('@/lib/require-admin');
    const { AuthError } = await import('@/lib/auth');
    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects an authenticated non-founder user', async () => {
    getSessionMock.mockResolvedValue({
      session: { id: 's1' },
      user: { id: 'user_2', email: 'regular@example.com', isFounder: false },
    });
    const { requireAdmin } = await import('@/lib/require-admin');
    const { AuthError } = await import('@/lib/auth');
    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects a user with no isFounder field at all', async () => {
    getSessionMock.mockResolvedValue({
      session: { id: 's1' },
      user: { id: 'user_3', email: 'nofield@example.com' },
    });
    const { requireAdmin } = await import('@/lib/require-admin');
    const { AuthError } = await import('@/lib/auth');
    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthError);
  });

  it('allows an authenticated founder user', async () => {
    const founder = { id: 'user_1', email: 'founder@example.com', isFounder: true };
    getSessionMock.mockResolvedValue({ session: { id: 's1' }, user: founder });
    const { requireAdmin } = await import('@/lib/require-admin');
    await expect(requireAdmin()).resolves.toEqual(founder);
  });
});
