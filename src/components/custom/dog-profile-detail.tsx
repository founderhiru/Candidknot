// @polsia:user-owned — public dog profile detail view.
'use client';

import { ArrowLeft, Check, MapPin, PawPrint, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import {
  type DogProfileItem as DogProfileItemType,
  DogProfileList,
} from '@/lib/contracts/dog-profiles';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'found'; profile: DogProfileItemType };

export function DogProfileDetail({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [retryKey, setRetryKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryKey is an intentional manual re-trigger, never read inside the effect body — that's the point.
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    // Reuses the same public /api/dog-profiles endpoint and DogProfileList
    // contract that /discover uses — there is no per-profile API route yet,
    // and the dataset is currently 12 demo rows, so fetching the list and
    // finding the match by slug is the smallest safe way to back this page
    // without inventing a new backend surface. Revisit once discovery has
    // pagination and the dataset is no longer small enough to fetch whole.
    apiFetch('/api/dog-profiles', { schema: DogProfileList })
      .then((payload) => {
        if (!active) return;
        const profile = payload.items.find((item) => item.slug === slug);
        setState(profile ? { status: 'found', profile } : { status: 'not-found' });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [slug, retryKey]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container-page py-10 md:py-14">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="size-4" /> Back to Discover
        </Link>

        <div className="mt-8 max-w-2xl">
          {state.status === 'loading' && (
            <Card className="border-border/70 bg-card/70">
              <CardContent className="space-y-5 p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-16 rounded-[1.25rem]" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </CardContent>
            </Card>
          )}

          {state.status === 'error' && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex flex-col items-start gap-5 p-7">
                <div>
                  <p className="font-display text-2xl font-semibold">
                    The network is taking a beat.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground" role="alert">
                    We couldn’t load this profile. Please try again.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setRetryKey((value) => value + 1)}
                >
                  <RefreshCw className="size-4" /> Try again
                </Button>
              </CardContent>
            </Card>
          )}

          {state.status === 'not-found' && (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-start p-8 sm:p-10">
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <PawPrint className="size-5" />
                </div>
                <h1 className="mt-6 font-display text-3xl font-semibold">Profile not found.</h1>
                <p className="mt-3 max-w-md leading-7 text-muted-foreground">
                  This profile may have moved or is no longer part of the demo network.
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/discover">Back to Discover</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {state.status === 'found' && (
            <Card className="overflow-hidden border-border/80 bg-card/90 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-brand-100 font-display text-3xl font-semibold text-brand-800">
                      {initials(state.profile.name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-3xl font-semibold tracking-tight">
                          {state.profile.name}
                        </h1>
                        {state.profile.isVerified && (
                          <Badge className="gap-1 rounded-full bg-brand-100 text-brand-800 hover:bg-brand-100">
                            <ShieldCheck className="size-3" /> Verified
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {state.profile.breed} · {state.profile.ageYears}{' '}
                        {state.profile.ageYears === 1 ? 'year' : 'years'}
                      </p>
                    </div>
                  </div>
                  <PawPrint className="size-6 shrink-0 text-brand-300" />
                </div>

                <div className="mt-7 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-muted-foreground">
                    <MapPin className="size-4 shrink-0 text-brand-600" />
                    <span>{state.profile.city}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-muted-foreground">
                    <span className="flex size-4 items-center justify-center rounded-full border border-brand-500 text-[0.55rem] font-bold text-brand-700">
                      {state.profile.sex[0]}
                    </span>
                    <span>{state.profile.sex}</span>
                  </div>
                </div>

                <p className="mt-6 text-sm leading-6 text-muted-foreground">{state.profile.bio}</p>

                {state.profile.distanceKm !== null && (
                  <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-sm font-semibold text-brand-700">
                    <Check className="size-4" />
                    {state.profile.distanceKm.toFixed(1)} km away
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
