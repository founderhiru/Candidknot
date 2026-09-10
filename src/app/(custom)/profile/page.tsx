// @polsia:user-owned — metadata shell for the owner profile page.
import type { Metadata } from 'next';
import { OwnerProfileView } from '@/components/custom/owner-profile-view';

export const metadata: Metadata = {
  title: 'Your profile',
  description: 'View and edit your CanidKnot owner profile.',
  alternates: { canonical: '/profile' },
};

export default function ProfilePage() {
  return <OwnerProfileView />;
}
