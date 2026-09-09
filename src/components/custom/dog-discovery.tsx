// @polsia:user-owned — interactive public dog discovery island.
'use client';

import { Check, MapPin, PawPrint, RefreshCw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { apiFetch } from '@/lib/api-client';
import {
  type DogProfileItem as DogProfileItemType,
  DogProfileList,
  type DogProfileList as DogProfileListType,
} from '@/lib/contracts/dog-profiles';

type FilterValues = {
  breed: string;
  city: string;
  radiusKm: number;
};

type FilterControlsProps = {
  facets: DogProfileListType['filters'];
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  idPrefix: string;
};

const DEFAULT_RADIUS_OPTIONS = [5, 10, 25, 50, 75, 100];
const DEFAULT_FACETS: DogProfileListType['filters'] = {
  breeds: [],
  cities: [],
  radiusOptions: DEFAULT_RADIUS_OPTIONS,
};

function includeCurrentOption(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

function FilterControls({ facets, filters, onChange, idPrefix }: FilterControlsProps) {
  const breeds = includeCurrentOption(facets.breeds, filters.breed);
  const cities = includeCurrentOption(facets.cities, filters.city);
  const radiusOptions = facets.radiusOptions.length ? facets.radiusOptions : DEFAULT_RADIUS_OPTIONS;
  const minRadius = radiusOptions[0] ?? 5;
  const maxRadius = radiusOptions[radiusOptions.length - 1] ?? 100;

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-breed`} className="text-sm font-semibold text-foreground">
          Breed
        </label>
        <Select
          value={filters.breed || 'all'}
          onValueChange={(value) => onChange({ ...filters, breed: value === 'all' ? '' : value })}
        >
          <SelectTrigger id={`${idPrefix}-breed`} className="h-11 bg-background/70">
            <SelectValue placeholder="All breeds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All breeds</SelectItem>
            {breeds.map((breed) => (
              <SelectItem key={breed} value={breed}>
                {breed}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-city`} className="text-sm font-semibold text-foreground">
          Search from
        </label>
        <Select
          value={filters.city || 'all'}
          onValueChange={(value) => onChange({ ...filters, city: value === 'all' ? '' : value })}
        >
          <SelectTrigger id={`${idPrefix}-city`} className="h-11 bg-background/70">
            <SelectValue placeholder="Everywhere" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everywhere</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <label htmlFor={`${idPrefix}-radius`} className="text-sm font-semibold text-foreground">
            Radius
          </label>
          <span className="font-mono text-sm font-semibold text-brand-700">
            {filters.radiusKm} km
          </span>
        </div>
        <Slider
          id={`${idPrefix}-radius`}
          min={minRadius}
          max={maxRadius}
          step={5}
          value={[Math.min(Math.max(filters.radiusKm, minRadius), maxRadius)]}
          onValueCommit={(value) => {
            const nextRadius = value[0];
            if (typeof nextRadius === 'number') onChange({ ...filters, radiusKm: nextRadius });
          }}
          aria-label="Search radius in kilometres"
        />
        <div className="flex justify-between text-[0.7rem] text-muted-foreground">
          <span>{minRadius} km</span>
          <span>{maxRadius} km</span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Choose a city to apply this radius. Without one, browse the full demo network.
        </p>
      </div>

      {(filters.breed || filters.city) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0 text-brand-700 hover:bg-transparent hover:text-brand-800"
          onClick={() => onChange({ breed: '', city: '', radiusKm: filters.radiusKm })}
        >
          Clear breed and city
        </Button>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProfileCard({ profile }: { profile: DogProfileItemType }) {
  return (
    <Card className="group overflow-hidden border-border/80 bg-card/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-brand-100 font-display text-2xl font-semibold text-brand-800 transition-transform duration-300 group-hover:rotate-[-4deg]">
              {initials(profile.name)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {profile.name}
                </h2>
                {profile.isVerified && (
                  <Badge className="gap-1 rounded-full bg-brand-100 text-brand-800 hover:bg-brand-100">
                    <ShieldCheck className="size-3" /> Verified
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.breed} · {profile.ageYears} {profile.ageYears === 1 ? 'year' : 'years'}
              </p>
            </div>
          </div>
          <PawPrint className="size-5 shrink-0 text-brand-300 transition-colors group-hover:text-brand-600" />
        </div>

        <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-brand-600" />
            <span>{profile.city}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-muted-foreground">
            <span className="flex size-4 items-center justify-center rounded-full border border-brand-500 text-[0.55rem] font-bold text-brand-700">
              {profile.sex[0]}
            </span>
            <span>{profile.sex}</span>
          </div>
        </div>

        <p className="mt-5 min-h-12 text-sm leading-6 text-muted-foreground">{profile.bio}</p>
        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm font-semibold text-brand-700">
          <Check className="size-4" />
          {profile.distanceKm === null
            ? 'Choose a city for distance'
            : `${profile.distanceKm.toFixed(1)} km away`}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {['one', 'two', 'three', 'four'].map((key) => (
        <Card key={key} className="border-border/70 bg-card/70">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-[1.25rem]" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DogDiscovery() {
  const [filters, setFilters] = useState<FilterValues>({
    breed: '',
    city: '',
    radiusKm: 25,
  });
  const [data, setData] = useState<DogProfileListType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_retryKey, setRetryKey] = useState(0);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ radiusKm: String(filters.radiusKm) });
    if (filters.breed) params.set('breed', filters.breed);
    if (filters.city) params.set('city', filters.city);

    setIsLoading(true);
    setError(null);
    apiFetch(`/api/dog-profiles?${params.toString()}`, {
      schema: DogProfileList,
    })
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('We couldn’t load the discovery network. Please try again.');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const facets = data?.filters ?? DEFAULT_FACETS;
  const hasFilters = Boolean(filters.breed || filters.city);

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <section className="relative border-b border-border bg-gradient-to-br from-brand-100/60 via-background to-background">
        <div className="container-page relative py-14 md:py-20 lg:py-24">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-3 duration-700">
            <p className="text-eyebrow">The CanidKnot network</p>
            <h1 className="mt-4 max-w-3xl font-display text-h1 text-foreground md:text-display">
              Find a thoughtful match, close to home.
            </h1>
            <p className="mt-6 max-w-2xl text-body-lg text-muted-foreground">
              Browse demo profiles by breed and city. Every distance is calculated from the city
              center, so you can start with useful context before you connect.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-2 rounded-full bg-background/60 px-3 py-1.5">
              <ShieldCheck className="size-3.5 text-brand-600" />
              Welfare-first discovery
            </Badge>
            <span className="hidden text-brand-300 sm:inline">•</span>
            <span>12 demo profiles across six cities</span>
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        <div className="mb-6 flex items-center justify-between gap-4 md:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">Tune your search</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasFilters ? 'Filters are active' : 'Start with a breed or city'}
            </p>
          </div>
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="gap-2 rounded-full">
                <SlidersHorizontal className="size-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(88vw,22rem)] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle className="font-display text-2xl">Tune your search</SheetTitle>
                <SheetDescription>
                  Find a smaller, more relevant part of the network.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-8">
                <FilterControls
                  facets={facets}
                  filters={filters}
                  onChange={setFilters}
                  idPrefix="mobile"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
          <aside className="sticky top-24 hidden h-fit rounded-2xl border border-border/80 bg-muted/30 p-5 md:block">
            <div className="mb-7 border-b border-border pb-5">
              <p className="text-eyebrow">Refine</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start broad, then bring the right details into focus.
              </p>
            </div>
            <FilterControls
              facets={facets}
              filters={filters}
              onChange={setFilters}
              idPrefix="desktop"
            />
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex min-h-10 items-center justify-between gap-4">
              <div aria-live="polite">
                {isLoading ? (
                  <span className="text-sm text-muted-foreground">Finding profiles…</span>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{data?.total ?? 0}</span>{' '}
                    {data?.total === 1 ? 'profile' : 'profiles'} found
                    {filters.city ? ` near ${filters.city}` : ''}
                  </p>
                )}
              </div>
              {hasFilters && !isLoading && (
                <Badge variant="secondary" className="hidden rounded-full sm:inline-flex">
                  {filters.breed || 'All breeds'}
                </Badge>
              )}
            </div>

            {error ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="flex flex-col items-start gap-5 p-7">
                  <div>
                    <p className="font-display text-2xl font-semibold">
                      The network is taking a beat.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground" role="alert">
                      {error}
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
            ) : isLoading && !data ? (
              <LoadingGrid />
            ) : data?.items.length === 0 ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-start p-8 sm:p-12">
                  <div className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <PawPrint className="size-5" />
                  </div>
                  <h2 className="mt-6 font-display text-3xl font-semibold">
                    No close matches yet.
                  </h2>
                  <p className="mt-3 max-w-md leading-7 text-muted-foreground">
                    Try widening the radius or clearing a filter. New profiles will make this
                    network more useful over time.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6"
                    onClick={() => setFilters({ breed: '', city: '', radiusKm: 50 })}
                  >
                    Broaden the search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {data?.items.map((profile) => (
                  <ProfileCard key={profile.id} profile={profile} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
