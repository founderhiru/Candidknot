// @polsia:user-owned — Phase 3: owner profile create/view/edit.
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
import { OwnerProfileItem, OwnerProfileWrite } from '@/lib/contracts/owner-profile';
import { applyServerErrors } from '@/lib/forms';

type LoadState =
  | { status: 'loading' }
  | { status: 'not-created' }
  | { status: 'loaded'; profile: OwnerProfileItem }
  | { status: 'error' };

export function OwnerProfileView() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [editing, setEditing] = useState(false);

  const form = useForm<OwnerProfileWrite>({
    resolver: zodResolver(OwnerProfileWrite),
    defaultValues: { city: '', bio: '' },
  });

  // Unauthenticated users are sent to sign in — this page never renders
  // profile data without a session.
  useEffect(() => {
    if (!sessionPending && !session?.session) {
      router.replace('/login?next=/profile');
    }
  }, [sessionPending, session, router]);

  useEffect(() => {
    if (sessionPending || !session?.session) return;
    let active = true;
    apiFetch('/api/owner-profile', { schema: OwnerProfileItem })
      .then((profile) => {
        if (!active) return;
        setState({ status: 'loaded', profile });
        form.reset({ city: profile.city, bio: profile.bio });
      })
      .catch((err: Error) => {
        if (!active) return;
        // The route returns 404 (no profile yet) before a real profile
        // exists — that's an expected state, not a load failure.
        const cause = err.cause as { error?: string } | null;
        if (cause?.error === 'Owner profile not found') {
          setState({ status: 'not-created' });
          setEditing(true);
        } else {
          setState({ status: 'error' });
        }
      });
    return () => {
      active = false;
    };
  }, [sessionPending, session, form]);

  if (sessionPending || !session?.session || state.status === 'loading') {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved =
        state.status === 'loaded'
          ? await apiFetch('/api/owner-profile', {
              method: 'PATCH',
              body: JSON.stringify(values),
              schema: OwnerProfileItem,
            })
          : await apiFetch('/api/owner-profile', {
              method: 'POST',
              body: JSON.stringify(values),
              schema: OwnerProfileItem,
            });
      setState({ status: 'loaded', profile: saved });
      setEditing(false);
      toast.success('Profile saved.');
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
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            {state.status === 'loaded'
              ? 'Visible to other owners once your dog profiles are discoverable.'
              : 'Set up your owner profile to add a dog.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {state.status === 'error' ? (
            <p className="text-sm text-destructive">Could not load your profile.</p>
          ) : state.status === 'loaded' && !editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">City</p>
                <p className="text-sm">{state.profile.city}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Bio</p>
                <p className="whitespace-pre-wrap text-sm">{state.profile.bio}</p>
              </div>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Tell other owners about yourself."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving…' : 'Save profile'}
                  </Button>
                  {state.status === 'loaded' && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        form.reset({ city: state.profile.city, bio: state.profile.bio });
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
