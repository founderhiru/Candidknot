// @polsia:user-owned — Phase 3: the authenticated owner's own dog list.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { useSession } from '@/lib/auth-client';
import { type OwnedDogProfileItem, OwnedDogProfileList } from '@/lib/contracts/dog-profiles';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; items: OwnedDogProfileItem[] };

export function MyDogsView() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!sessionPending && !session?.session) {
      router.replace('/login?next=/dogs');
    }
  }, [sessionPending, session, router]);

  useEffect(() => {
    if (sessionPending || !session?.session) return;
    let active = true;
    apiFetch('/api/dog-profiles/mine', { schema: OwnedDogProfileList })
      .then((payload) => {
        if (active) setState({ status: 'loaded', items: payload.items });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [sessionPending, session]);

  if (sessionPending || !session?.session || state.status === 'loading') {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your dogs</h1>
        <Button asChild size="sm">
          <Link href="/dogs/new">Add a dog</Link>
        </Button>
      </div>

      {state.status === 'error' ? (
        <p className="text-sm text-destructive">Could not load your dogs.</p>
      ) : state.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven&apos;t added a dog profile yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {state.items.map((dog) => (
            <Card key={dog.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="text-base">{dog.name}</CardTitle>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/dogs/${dog.id}`}>Edit</Link>
                </Button>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {dog.breed} · {dog.city} · {dog.ageYears}y
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
