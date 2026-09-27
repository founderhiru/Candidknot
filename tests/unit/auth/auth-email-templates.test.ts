// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertPublicMagicLinkUrl, buildMagicLinkEmail } from '@/lib/auth-email-templates';

const LINK =
  'https://kinro.example.com/api/auth/magic-link/verify?token=abc123&callbackURL=canidknot%3A%2F%2F%2F';

describe('buildMagicLinkEmail', () => {
  it('puts the link in both the plain-text and HTML parts', () => {
    const { subject, text, html } = buildMagicLinkEmail(LINK);
    expect(subject).toBe('Your KINRO sign-in link');
    expect(text).toContain(LINK);
    expect(html).toContain(
      'href="https://kinro.example.com/api/auth/magic-link/verify?token=abc123',
    );
  });

  it('HTML-escapes the URL (the & separators must not break the href)', () => {
    const { html } = buildMagicLinkEmail(LINK);
    expect(html).toContain('token=abc123&amp;callbackURL=');
    expect(html).not.toContain('token=abc123&callbackURL=');
  });

  it('cannot be used to inject markup through the URL', () => {
    const { html } = buildMagicLinkEmail('https://x.example.com/?a="><script>alert(1)</script>');
    expect(html).not.toContain('<script>');
  });

  it('states the expiry that matches the server (10 minutes) and single use', () => {
    const { text } = buildMagicLinkEmail(LINK);
    expect(text).toMatch(/10 minutes/);
    expect(text).toMatch(/once/);
  });
});

describe('assertPublicMagicLinkUrl', () => {
  it('accepts a public https link in production', () => {
    expect(() => assertPublicMagicLinkUrl(LINK, 'production')).not.toThrow();
  });

  it('rejects localhost / loopback links in production (they can never open on a phone)', () => {
    for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000']) {
      expect(() =>
        assertPublicMagicLinkUrl(`http://${host}/api/auth/magic-link/verify?token=x`, 'production'),
      ).toThrow(/NEXT_PUBLIC_APP_URL/);
    }
  });

  it('allows localhost outside production (local development)', () => {
    expect(() =>
      assertPublicMagicLinkUrl(
        'http://localhost:3000/api/auth/magic-link/verify?token=x',
        'development',
      ),
    ).not.toThrow();
    expect(() => assertPublicMagicLinkUrl('http://localhost:3000/x', undefined)).not.toThrow();
  });

  it('rejects a malformed URL in production', () => {
    expect(() => assertPublicMagicLinkUrl('not a url', 'production')).toThrow();
  });
});
