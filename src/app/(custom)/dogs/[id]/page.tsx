// @polsia:user-owned — metadata shell for viewing/editing one owned dog
// profile. Ownership is enforced server-side by /api/dog-profiles/[id]
// (requireResourceOwner) — this page never assumes the :id belongs to the
// signed-in user.
import type { Metadata } from 'next';
import { DogFormView } from '@/components/custom/dog-form-view';

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Edit dog profile',
  robots: { index: false },
};

export default async function EditDogPage({ params }: PageProps) {
  const { id } = await params;
  return <DogFormView dogId={id} />;
}
