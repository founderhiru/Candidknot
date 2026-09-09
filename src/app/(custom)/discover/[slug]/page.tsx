// @polsia:user-owned — metadata shell for a single public dog profile.
import type { Metadata } from 'next';
import { DogProfileDetail } from '@/components/custom/dog-profile-detail';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: 'Dog profile',
    description: 'View this demo dog profile on the CanidKnot discovery network.',
    alternates: { canonical: `/discover/${slug}` },
  };
}

export default async function DogProfilePage({ params }: PageProps) {
  const { slug } = await params;
  return <DogProfileDetail slug={slug} />;
}
