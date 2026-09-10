// @vitest-environment node
//
// Unit-tests the app's OWN identity/ownership wrapper functions
// (getAuthenticatedUser/requireAuthenticatedUser/requireResourceOwner),
// not better-auth's internals (session storage, cookie signing, OTP/magic
// link mechanics) — those are better-auth's own, independently maintained
// implementation. What matters here is that our code (a) never trusts
// anything but the server-derived session for identity, and (b) correctly
// rejects an IDOR-style mismatch between the authenticated user and a
// resource's actual owner.
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

// better-auth itself, its Prisma adapter, and its plugins are mocked out —
// this suite only needs the shape auth.ts consumes (a `betterAuth()` call
// returning an object with `api.getSession`), not real session/OTP logic.
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

const FOUNDER_USER = { id: 'user_1', email: 'founder@example.com', isFounder: true };
const REGULAR_USER = { id: 'user_2', email: 'regular@example.com', isFounder: false };

describe('getAuthenticatedUser / requireAuthenticatedUser', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
  });

  it('returns null when there is no session (unauthenticated request)', async () => {
    getSessionMock.mockResolvedValue(null);
    const { getAuthenticatedUser } = await import('@/lib/auth');
    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });

  it('returns the user when a session exists (authenticated request succeeds)', async () => {
    getSessionMock.mockResolvedValue({ session: { id: 's1' }, user: REGULAR_USER });
    const { getAuthenticatedUser } = await import('@/lib/auth');
    await expect(getAuthenticatedUser()).resolves.toEqual(REGULAR_USER);
  });

  it('requireAuthenticatedUser throws AuthError for no session (also covers logged-out/expired sessions, which getSession likewise resolves to null for)', async () => {
    getSessionMock.mockResolvedValue(null);
    const { requireAuthenticatedUser, AuthError } = await import('@/lib/auth');
    await expect(requireAuthenticatedUser()).rejects.toBeInstanceOf(AuthError);
  });

  it('requireAuthenticatedUser resolves with the user when authenticated', async () => {
    getSessionMock.mockResolvedValue({ session: { id: 's1' }, user: REGULAR_USER });
    const { requireAuthenticatedUser } = await import('@/lib/auth');
    await expect(requireAuthenticatedUser()).resolves.toEqual(REGULAR_USER);
  });
});

describe('requireResourceOwner (IDOR protection)', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
  });

  it('rejects an unauthenticated caller regardless of the resource', async () => {
    getSessionMock.mockResolvedValue(null);
    const { requireResourceOwner, AuthError } = await import('@/lib/auth');
    await expect(requireResourceOwner('user_1')).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects User A when the resource belongs to User B (client cannot reach another user's resource)", async () => {
    getSessionMock.mockResolvedValue({ session: { id: 's1' }, user: REGULAR_USER });
    const { requireResourceOwner, AuthError } = await import('@/lib/auth');
    // REGULAR_USER (user_2) attempting to access a resource actually owned
    // by user_1 — the ownerId here stands in for a value loaded from the
    // DB row being acted on, never from client input.
    await expect(requireResourceOwner(FOUNDER_USER.id)).rejects.toBeInstanceOf(AuthError);
  });

  it('allows the authenticated owner to access their own resource', async () => {
    getSessionMock.mockResolvedValue({ session: { id: 's1' }, user: REGULAR_USER });
    const { requireResourceOwner } = await import('@/lib/auth');
    await expect(requireResourceOwner(REGULAR_USER.id)).resolves.toEqual(REGULAR_USER);
  });

  it('rejects access to an ownerless (system/demo) resource — nobody "owns" it', async () => {
    getSessionMock.mockResolvedValue({ session: { id: 's1' }, user: REGULAR_USER });
    const { requireResourceOwner, AuthError } = await import('@/lib/auth');
    await expect(requireResourceOwner(null)).rejects.toBeInstanceOf(AuthError);
  });
});
