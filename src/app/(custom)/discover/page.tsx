// @polsia:user-owned — metadata shell for the public discovery surface.
import type { Metadata } from 'next';
import { DogDiscovery } from '@/components/custom/dog-discovery';

export const metadata: Metadata = {
  title: 'Discover nearby dogs',
  description:
    'Explore demo dog profiles by breed, city, and radius with CanidKnot’s welfare-first approach.',
  alternates: { canonical: '/discover' },
};

export default function DiscoverPage() {
  return <DogDiscovery />;
}
