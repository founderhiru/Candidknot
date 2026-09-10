// @polsia:user-owned — metadata shell for the authenticated owner's dog list.
import type { Metadata } from 'next';
import { MyDogsView } from '@/components/custom/my-dogs-view';

export const metadata: Metadata = {
  title: 'Your dogs',
  description: 'View and manage your own dog profiles on CanidKnot.',
  alternates: { canonical: '/dogs' },
};

export default function MyDogsPage() {
  return <MyDogsView />;
}
