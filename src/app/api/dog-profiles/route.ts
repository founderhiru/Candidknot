// @polsia:user-owned — public dog discovery endpoint (GET, unchanged from
// Phase 2) + Phase 3 authenticated dog creation (POST). POST requires a
// session and always derives ownerId from that session, never from the
// request body.
import 'server-only';

import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/auth';
import { DogDiscoveryQuery, DogProfileList, DogProfileWrite } from '@/lib/contracts/dog-profiles';
import { prisma } from '@/lib/db';

// Minimal URL-safe slug from the dog's name plus a short random suffix for
// uniqueness — there is no per-owner slug editing UI, so this only needs to
// avoid collisions, not be pretty.
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'dog'}-${Math.random().toString(36).slice(2, 8)}`;
}

export const dynamic = 'force-dynamic';

const RADIUS_OPTIONS = [5, 10, 25, 50, 75, 100] as const;

const CITY_CENTERS = {
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  'Delhi NCR': { latitude: 28.6139, longitude: 77.209 },
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Hyderabad: { latitude: 17.385, longitude: 78.4867 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  Chennai: { latitude: 13.0827, longitude: 80.2707 },
} as const;

function findCityCenter(city: string | undefined) {
  if (!city) return undefined;
  const entry = Object.entries(CITY_CENTERS).find(
    ([name]) => name.toLocaleLowerCase('en-IN') === city.toLocaleLowerCase('en-IN'),
  );
  return entry ? { name: entry[0], ...entry[1] } : undefined;
}

function haversineDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitudeOne = toRadians(from.latitude);
  const latitudeTwo = toRadians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = DogDiscoveryQuery.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid discovery filters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const cityCenter = findCityCenter(parsed.data.city);
    const profiles = await prisma.dogProfile.findMany({
      where: parsed.data.breed
        ? { breed: { equals: parsed.data.breed, mode: 'insensitive' } }
        : undefined,
    });

    const profilesWithDistance = profiles.map((profile) => ({
      id: profile.id,
      slug: profile.slug,
      name: profile.name,
      breed: profile.breed,
      city: profile.city,
      latitude: profile.latitude,
      longitude: profile.longitude,
      ageYears: profile.ageYears,
      sex: profile.sex,
      bio: profile.bio,
      isVerified: profile.isVerified,
      distanceKm: cityCenter
        ? Math.round(
            haversineDistanceKm(cityCenter, {
              latitude: profile.latitude,
              longitude: profile.longitude,
            }) * 10,
          ) / 10
        : null,
    }));

    const matchingProfiles = profilesWithDistance.filter(
      (profile) => profile.distanceKm === null || profile.distanceKm <= parsed.data.radiusKm,
    );

    if (cityCenter) {
      matchingProfiles.sort(
        (first, second) =>
          (first.distanceKm ?? Number.POSITIVE_INFINITY) -
            (second.distanceKm ?? Number.POSITIVE_INFINITY) ||
          first.name.localeCompare(second.name),
      );
    } else {
      matchingProfiles.sort((first, second) => first.name.localeCompare(second.name));
    }

    const breeds = [...new Set(matchingProfiles.map((profile) => profile.breed))].sort((a, b) =>
      a.localeCompare(b),
    );
    const cities = [...new Set(matchingProfiles.map((profile) => profile.city))].sort((a, b) =>
      a.localeCompare(b),
    );

    const payload = DogProfileList.parse({
      items: matchingProfiles,
      total: matchingProfiles.length,
      filters: { breeds, cities, radiusOptions: [...RADIUS_OPTIONS] },
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Unable to load dog profiles' }, { status: 500 });
  }
}

// Phase 3 — create a dog profile owned by the authenticated user. ownerId
// is ALWAYS the server-derived session user's id; nothing from the request
// body ever reaches the ownerId column.
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const parsed = DogProfileWrite.safeParse(await request.json());
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errors: Record<string, string> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const message = messages?.[0];
        if (message) {
          errors[field] = message;
        }
      }
      return NextResponse.json({ errors }, { status: 400 });
    }

    const created = await prisma.dogProfile.create({
      data: {
        ...parsed.data,
        slug: slugify(parsed.data.name),
        isVerified: false,
        ownerId: user.id,
      },
    });

    // A brand-new dog has neither yet — supplied explicitly since
    // OwnedDogProfileItem no longer defaults these (see its contract).
    return NextResponse.json({ ...created, photos: [], healthRecords: [] }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unable to create dog profile' }, { status: 500 });
  }
}
