// Pure builders for the magic-link email (subject + plain text + HTML).
// Kept free of server-only/Resend imports so they are trivially unit-testable.
//
// The link is the ONLY thing that matters in this email, so both parts lead
// with it. HTML adds a tappable button (some mail clients don't auto-link long
// plain-text URLs); the plain-text part stays as the universal fallback.

const LINK_VALID_MINUTES = 10;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildMagicLinkEmail(url: string): { subject: string; text: string; html: string } {
  const text = `Sign in to KINRO by opening this link on your phone:\n\n${url}\n\nIt expires in ${LINK_VALID_MINUTES} minutes and works once. If you didn't request this, you can ignore this email.`;

  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FBF8F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f1f1f;">
    <div style="max-width:480px;margin:0 auto;">
      <h1 style="font-size:20px;margin:0 0 16px;">Sign in to KINRO</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px;">Tap the button below on your phone to finish signing in.</p>
      <p style="margin:0 0 24px;">
        <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;background:#1f1f1f;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;">Sign in to KINRO</a>
      </p>
      <p style="font-size:14px;line-height:1.5;color:#555;margin:0 0 8px;">Or paste this link into your browser:</p>
      <p style="font-size:13px;line-height:1.4;color:#555;word-break:break-all;margin:0 0 24px;">${safeUrl}</p>
      <p style="font-size:13px;line-height:1.5;color:#777;margin:0;">This link expires in ${LINK_VALID_MINUTES} minutes and works once. If you didn't request it, you can ignore this email.</p>
    </div>
  </body>
</html>`;

  return { subject: 'Your KINRO sign-in link', text, html };
}

/**
 * A magic link is only usable if it points at a public origin. A localhost /
 * loopback host means NEXT_PUBLIC_APP_URL was left at its development default
 * on a real deployment — the email would arrive but the link could never open
 * on the user's phone. Failing the send loudly beats a silently dead email.
 */
export function assertPublicMagicLinkUrl(url: string, nodeEnv: string | undefined): void {
  if (nodeEnv !== 'production') return;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('Magic link URL is not a valid URL.');
  }
  // URL#hostname keeps the brackets on IPv6 literals ("[::1]").
  const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'];
  if (loopback.includes(host) || host.endsWith('.local')) {
    throw new Error(
      `Magic link would point at "${host}". Set NEXT_PUBLIC_APP_URL to the public https origin of this deployment.`,
    );
  }
}
