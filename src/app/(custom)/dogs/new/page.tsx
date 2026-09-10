// @polsia:user-owned — metadata shell for creating a dog profile.
import type { Metadata } from 'next';
import { DogFormView } from '@/components/custom/dog-form-view';

export const metadata: Metadata = {
  title: 'Add a dog',
  description: 'Create a new dog profile on CanidKnot.',
  alternates: { canonical: '/dogs/new' },
};

export default function NewDogPage() {
  return <DogFormView />;
}
