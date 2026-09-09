// @polsia:user-owned — server-only transactional email sender (Phase 2).
// Used exclusively by @/lib/auth's magicLink plugin. Deliberately generic
// (subject + text in, nothing OTP/magic-link-specific baked in here) so the
// provider/sender/domain can change later without touching auth logic.
//
// Provider: Resend. In sandbox mode (no verified sending domain yet — see
// .env.example), Resend only delivers to the account's own verified email
// address; every other recipient is silently accepted but not delivered.
// That is expected until CanidKnot has a verified domain — swap EMAIL_FROM
// to a verified address at that point, no code change required here.
import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendAuthEmail(to: string, subject: string, text: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
  });

  if (error) {
    // Thrown error surfaces to the caller (better-auth's magicLink plugin),
    // which fails the send request rather than silently pretending an
    // email went out.
    throw new Error(`Failed to send auth email: ${error.message}`);
  }
}
