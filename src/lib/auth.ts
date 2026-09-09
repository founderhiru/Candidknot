// @polsia:user-owned — server-only better-auth instance (Phase 2).
//
// This is the ONLY place session/identity logic lives. Route handlers read
// the authenticated user via getAuthenticatedUser()/requireAuthenticatedUser()
// below — never by trusting a userId/ownerId/email/phoneNumber supplied by
// the client.
//
// Three passwordless sign-in methods, all via official better-auth plugins
// (no custom OTP/session/JWT logic):
//   - Google OAuth (socialProviders.google)
//   - Mobile OTP (better-auth's phoneNumber plugin)
//   - Email magic link (better-auth's magicLink plugin)
//
// ACCOUNT LINKING DECISION (see Phase 2 report for the full writeup):
// Google and email-magic-link naturally converge to ONE User when the
// addresses match, because better-auth's default account linking allows
// connecting a new sign-in method to an existing User whenever the
// provider confirms the email as verified — Google always confirms this,
// and email ownership is proven by clicking the magic link. No
// `trustedProviders` override is needed or used (that setting exists to
// trust an *unverified*-email provider, which would raise account-takeover
// risk — deliberately not enabled here).
// Phone number is a SEPARATE identity axis in better-auth (its own
// `phoneNumber`/`phoneNumberVerified` columns on User, matched
// independently of email) — there is no built-in "same person" merge
// across phone and email/Google. Signing in by phone for the first time
// creates a distinct User. Linking a phone number to an
// already-authenticated email/Google account is possible but requires
// that user to be signed in and take an explicit action; that flow needs
// an account-settings surface, which is out of scope for this
// no-dashboard-yet phase. Documented as a deferred decision, not
// implemented automatically.
import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink, phoneNumber } from 'better-auth/plugins';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { sendAuthEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { sendOtpSms } from '@/lib/sms';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.SESSION_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,

  // No password surface at all — Google, phone OTP, and email magic link
  // are the only sign-in methods.
  emailAndPassword: { enabled: false },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  account: {
    accountLinking: {
      enabled: true, // default; kept explicit — see the linking decision above
      // Deliberately NOT set: trustedProviders. Google already confirms
      // verified email, which is sufficient for default linking; adding
      // it to trustedProviders would additionally trust an *unverified*
      // email from that provider, which we don't want.
    },
  },

  // Server-derived session: cookie holds only an opaque token; every lookup
  // re-reads the Session row from Postgres, so revoking a session (logout,
  // or an admin action later) takes effect immediately, unlike a stateless
  // JWT that stays valid until it expires on its own.
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once/day
    cookieCache: { enabled: false }, // always hit the DB — no stale cached session
  },

  advanced: {
    // HttpOnly + Secure(prod) + SameSite=Lax are better-auth's cookie
    // defaults; kept explicit here so the security posture is visible
    // in-repo rather than implied.
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Custom field for the founder/admin check used by requireAdmin() —
  // never set from client input; only ever changed directly in the DB.
  user: {
    additionalFields: {
      isFounder: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false, // not settable via any client-facing API
      },
    },
  },

  plugins: [
    magicLink({
      expiresIn: 60 * 10, // 10 minutes
      sendMagicLink: async ({ email, url }) => {
        await sendAuthEmail(
          email,
          'Your CanidKnot sign-in link',
          `Sign in to CanidKnot by opening this link: ${url}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        );
      },
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
      allowedAttempts: 5,
      sendOTP: async ({ phoneNumber: to, code }) => {
        await sendOtpSms(to, code);
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;

/**
 * Returns the authenticated user for the current request, derived
 * server-side from the session cookie — or null if there isn't one.
 * NEVER accept a userId/ownerId/email/phoneNumber from the request
 * body/query for identity; always call this instead.
 */
export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Same as getAuthenticatedUser(), but throws AuthError when there is none. */
export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthError('Authentication required');
  }
  return user;
}

/**
 * Requires the current session's user to be the owner of a resource.
 * `resourceOwnerId` must come from the database row being acted on — NEVER
 * from client-supplied input — so this only ever confirms "does the
 * server-derived identity match the server-loaded resource's owner",
 * which is what prevents IDOR (User A changing an id in the request to
 * reach User B's resource).
 */
export async function requireResourceOwner(resourceOwnerId: string | null) {
  const user = await requireAuthenticatedUser();
  if (resourceOwnerId === null || resourceOwnerId !== user.id) {
    throw new AuthError('Not authorized to access this resource');
  }
  return user;
}

export class AuthError extends Error {
  readonly status = 401;
}
