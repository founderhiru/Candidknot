// @polsia:user-owned — Phase 3: create/edit form for a dog profile owned by
// the authenticated user. In edit mode the dog is loaded via
// /api/dog-profiles/[id], which enforces server-side ownership
// (requireResourceOwner) — this component never assumes the id in the URL
// belongs to the current user.
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import { useSession } from '@/lib/auth-client';
import { DogProfileWrite, OwnedDogProfileItem } from '@/lib/contracts/dog-profiles';
import { applyServerErrors } from '@/lib/forms';

const EMPTY_VALUES: DogProfileWrite = {
  name: '',
  breed: '',
  city: '',
  latitude: 0,
  longitude: 0,
  ageYears: 0,
  sex: '',
  bio: '',
};

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

export function DogFormView({ dogId }: { dogId?: string }) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const isEdit = Boolean(dogId);
  const [state, setState] = useState<LoadState>(isEdit ? 'loading' : 'ready');

  const form = useForm<DogProfileWrite>({
    resolver: zodResolver(DogProfileWrite),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!sessionPending && !session?.session) {
      router.replace(`/login?next=${encodeURIComponent(isEdit ? `/dogs/${dogId}` : '/dogs/new')}`);
    }
  }, [sessionPending, session, router, isEdit, dogId]);

  useEffect(() => {
    if (!isEdit || sessionPending || !session?.session || !dogId) return;
    let active = true;
    apiFetch(`/api/dog-profiles/${dogId}`, { schema: OwnedDogProfileItem })
      .then((dog) => {
        if (!active) return;
        form.reset({
          name: dog.name,
          breed: dog.breed,
          city: dog.city,
          latitude: dog.latitude,
          longitude: dog.longitude,
          ageYears: dog.ageYears,
          sex: dog.sex,
          bio: dog.bio,
        });
        setState('ready');
      })
      .catch((err: Error) => {
        if (!active) return;
        const cause = err.cause as { error?: string } | null;
        setState(cause?.error === 'Dog profile not found' ? 'not-found' : 'error');
      });
    return () => {
      active = false;
    };
  }, [isEdit, dogId, sessionPending, session, form]);

  if (sessionPending || !session?.session || state === 'loading') {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (state === 'not-found') {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <p className="text-sm text-destructive">
          That dog profile doesn&apos;t exist, or isn&apos;t yours to edit.
        </p>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <p className="text-sm text-destructive">Could not load this dog profile.</p>
      </main>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await apiFetch(`/api/dog-profiles/${dogId}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
          schema: OwnedDogProfileItem,
        });
        toast.success(`Saved “${values.name}”.`);
      } else {
        await apiFetch('/api/dog-profiles', {
          method: 'POST',
          body: JSON.stringify(values),
          schema: OwnedDogProfileItem,
        });
        toast.success(`Added “${values.name}”.`);
      }
      router.push('/dogs');
    } catch (err) {
      const applied = err instanceof Error && applyServerErrors(err.cause, form.setError);
      if (!applied) {
        toast.error('Something went wrong. Please try again.');
      }
    }
  });

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit dog profile' : 'Add a dog'}</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Update the details on your dog profile.'
              : 'Create a profile for your dog on CanidKnot.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bodhi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl>
                      <Input placeholder="Labrador Retriever" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <FormControl>
                        <Input placeholder="Male" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age (years)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={30} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Bengaluru" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Calm and friendly." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add dog'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
