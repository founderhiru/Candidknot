// @polsia:user-owned — metadata shell for the sign-in page.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginView } from '@/components/custom/login-view';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to CanidKnot with Google, mobile, or email — no password required.',
  alternates: { canonical: '/login' },
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}
