// @polsia:user-owned — sign-in UI (Phase 2). Three passwordless methods,
// each calling the official better-auth client methods directly — no
// custom OTP/token logic lives here.
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient, useSession } from '@/lib/auth-client';
import { siteName } from '@/lib/site';

type Step = 'choose' | 'mobile-phone' | 'mobile-otp' | 'email-form' | 'email-sent';

// Both flows write plain messages here — better-auth's own error.message
// already distinguishes invalid/expired/rate-limited cases, so this stays a
// dumb pass-through rather than re-classifying errors itself.
function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

// Google OAuth and the magic-link verification GET are both full-page
// redirects handled entirely by better-auth's own route handler — a
// failure there (denied consent, cancelled OAuth, expired/already-used
// magic link) never runs our client code at all. It instead redirects
// the browser back to errorCallbackURL with `?error=<code>` (see
// continueWithGoogle/sendMagicLink below, which set errorCallbackURL to
// this page for exactly this reason). This reads that param back out.
function describeRedirectError(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case 'access_denied':
      return 'Google sign-in was cancelled.';
    case 'invalid_token':
    case 'token_expired':
      return 'That sign-in link has expired or was already used. Request a new one.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const { data: session, isPending: sessionPending } = useSession();

  const [step, setStep] = useState<Step>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    describeRedirectError(searchParams.get('error')),
  );

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  // Already authenticated — nothing to do here, return to the intended page.
  useEffect(() => {
    if (!sessionPending && session?.session) {
      router.replace(next);
    }
  }, [sessionPending, session, router, next]);

  if (sessionPending || session?.session) {
    return null;
  }

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = () =>
    withBusy(async () => {
      const { error: signInError } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: next,
        // Send OAuth failures/cancellations back to THIS page (with
        // ?error=<code>) instead of the default fallback — otherwise a
        // denied/cancelled Google consent screen would redirect straight
        // to `next` and no one would ever see why sign-in didn't happen.
        errorCallbackURL: '/login',
      });
      // A successful call redirects the browser away — reaching this line
      // at all means the OAuth request itself failed to start (cancelled
      // popup, misconfigured provider, etc.).
      if (signInError) {
        setError(signInError.message ?? 'Could not start Google sign-in.');
      }
    });

  const sendMobileOtp = () =>
    withBusy(async () => {
      const { error: sendError } = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
      if (sendError) {
        setError(sendError.message ?? 'Could not send the code.');
        return;
      }
      setStep('mobile-otp');
    });

  const verifyMobileOtp = () =>
    withBusy(async () => {
      const { error: verifyError } = await authClient.phoneNumber.verify({
        phoneNumber: phone,
        code: otp,
      });
      if (verifyError) {
        setError(verifyError.message ?? 'That code didn’t work.');
        return;
      }
      router.replace(next);
    });

  const sendMagicLink = () =>
    withBusy(async () => {
      const { error: sendError } = await authClient.signIn.magicLink({
        email,
        callbackURL: next,
        // Same reasoning as Google above: an expired/already-used link
        // should redirect back here with ?error=, not straight to `next`.
        errorCallbackURL: '/login',
      });
      if (sendError) {
        setError(sendError.message ?? 'Could not send the sign-in link.');
        return;
      }
      setStep('email-sent');
    });

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to {siteName}</CardTitle>
          <CardDescription>No password required.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === 'choose' && (
            <>
              <Button variant="outline" disabled={busy} onClick={continueWithGoogle}>
                Continue with Google
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setStep('mobile-phone');
                }}
              >
                Continue with Mobile
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setStep('email-form');
                }}
              >
                Continue with Email
              </Button>
              <ErrorText message={error} />
            </>
          )}

          {step === 'mobile-phone' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Mobile number</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <ErrorText message={error} />
              <Button disabled={busy || phone.trim().length < 8} onClick={sendMobileOtp}>
                Send code
              </Button>
              <Button variant="ghost" onClick={() => setStep('choose')}>
                Back
              </Button>
            </>
          )}

          {step === 'mobile-otp' && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the code sent to <span className="font-medium">{phone}</span>.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <ErrorText message={error} />
              <Button disabled={busy || otp.trim().length < 4} onClick={verifyMobileOtp}>
                Verify and sign in
              </Button>
              <Button variant="ghost" disabled={busy} onClick={sendMobileOtp}>
                Resend code
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setOtp('');
                  setStep('mobile-phone');
                }}
              >
                Use a different number
              </Button>
            </>
          )}

          {step === 'email-form' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <ErrorText message={error} />
              <Button disabled={busy || !email.includes('@')} onClick={sendMagicLink}>
                Send sign-in link
              </Button>
              <Button variant="ghost" onClick={() => setStep('choose')}>
                Back
              </Button>
            </>
          )}

          {step === 'email-sent' && (
            <>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-medium">{email}</span>. Open it on
                this device to finish signing in.
              </p>
              <Button variant="ghost" disabled={busy} onClick={sendMagicLink}>
                Resend link
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setStep('email-form');
                }}
              >
                Use a different email
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
