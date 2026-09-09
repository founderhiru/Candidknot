// @polsia:user-owned — deploy-time database seed. You OWN this file.
//
// seed() runs once when the server boots (via the framework-owned
// src/instrumentation.ts), on the Node server, AFTER the schema is applied. Use it
// for reference/lookup data your app needs to exist BEFORE the first request:
// plans, categories, feature defaults, a first admin row, etc. Read/write the DB
// through the Prisma singleton in @/lib/db (server startup — there is no request,
// so this does NOT go through /api).
//
// RULES — this runs on EVERY deploy/boot, possibly more than once, possibly on more
// than one instance at the same time:
//   1. Make every write IDEMPOTENT — upsert (`where` + `create` + `update`) or
//      `createMany({ ..., skipDuplicates: true })`, NEVER a bare `create`/`insert`.
//   2. Keep it fast and small — it runs before the server serves traffic.
//   3. NOT for recurring work (that's polsia.toml `[[crons]]`) or per-user/
//      request-time logic (that's an /api route handler). There is no request here.

import { prisma } from '@/lib/db';

const demoProfiles = [
  {
    slug: 'bodhi-bengaluru',
    name: 'Bodhi',
    breed: 'Labrador Retriever',
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    ageYears: 3,
    sex: 'Male',
    bio: 'Easygoing, playful, and happiest on a long morning walk.',
    isVerified: true,
  },
  {
    slug: 'miso-bengaluru',
    name: 'Miso',
    breed: 'Cocker Spaniel',
    city: 'Bengaluru',
    latitude: 13.0352,
    longitude: 77.597,
    ageYears: 4,
    sex: 'Female',
    bio: 'A gentle homebody with a bright temperament and a clean health record.',
    isVerified: true,
  },
  {
    slug: 'rio-delhi-ncr',
    name: 'Rio',
    breed: 'Golden Retriever',
    city: 'Delhi NCR',
    latitude: 28.6139,
    longitude: 77.209,
    ageYears: 5,
    sex: 'Male',
    bio: 'Steady and sociable, with plenty of patience for new people.',
    isVerified: true,
  },
  {
    slug: 'zoya-delhi-ncr',
    name: 'Zoya',
    breed: 'Indie',
    city: 'Delhi NCR',
    latitude: 28.535,
    longitude: 77.391,
    ageYears: 3,
    sex: 'Female',
    bio: 'Curious, affectionate, and a quick learner who loves a good puzzle.',
    isVerified: false,
  },
  {
    slug: 'pepper-mumbai',
    name: 'Pepper',
    breed: 'Beagle',
    city: 'Mumbai',
    latitude: 19.076,
    longitude: 72.8777,
    ageYears: 4,
    sex: 'Female',
    bio: 'A sunny-natured explorer with a soft spot for every scent in the city.',
    isVerified: true,
  },
  {
    slug: 'atlas-mumbai',
    name: 'Atlas',
    breed: 'German Shepherd',
    city: 'Mumbai',
    latitude: 19.1136,
    longitude: 72.8697,
    ageYears: 6,
    sex: 'Male',
    bio: 'Calm, attentive, and happiest with an owner who values routine.',
    isVerified: false,
  },
  {
    slug: 'taro-hyderabad',
    name: 'Taro',
    breed: 'Shih Tzu',
    city: 'Hyderabad',
    latitude: 17.385,
    longitude: 78.4867,
    ageYears: 3,
    sex: 'Male',
    bio: 'Small in size, big in personality, and wonderfully people-oriented.',
    isVerified: true,
  },
  {
    slug: 'luna-hyderabad',
    name: 'Luna',
    breed: 'Pomeranian',
    city: 'Hyderabad',
    latitude: 17.42,
    longitude: 78.448,
    ageYears: 2,
    sex: 'Female',
    bio: 'Bright and spirited, with a playful streak and a calm home routine.',
    isVerified: true,
  },
  {
    slug: 'chai-pune',
    name: 'Chai',
    breed: 'Indie',
    city: 'Pune',
    latitude: 18.5204,
    longitude: 73.8567,
    ageYears: 4,
    sex: 'Male',
    bio: 'Warm, observant, and ready for an unhurried walk through the hills.',
    isVerified: false,
  },
  {
    slug: 'saffron-pune',
    name: 'Saffron',
    breed: 'Labrador Retriever',
    city: 'Pune',
    latitude: 18.5679,
    longitude: 73.9143,
    ageYears: 5,
    sex: 'Female',
    bio: 'Gentle with a joyful energy and a fondness for splashy monsoon walks.',
    isVerified: true,
  },
  {
    slug: 'maru-chennai',
    name: 'Maru',
    breed: 'Dachshund',
    city: 'Chennai',
    latitude: 13.0827,
    longitude: 80.2707,
    ageYears: 3,
    sex: 'Male',
    bio: 'A confident little companion with a sunny, easygoing disposition.',
    isVerified: true,
  },
  {
    slug: 'nila-chennai',
    name: 'Nila',
    breed: 'Golden Retriever',
    city: 'Chennai',
    latitude: 13.0475,
    longitude: 80.209,
    ageYears: 4,
    sex: 'Female',
    bio: 'Soft-natured and playful, with a love for people and cool evening walks.',
    isVerified: false,
  },
] as const;

export async function seed(): Promise<void> {
  for (const profile of demoProfiles) {
    await prisma.dogProfile.upsert({
      where: { slug: profile.slug },
      create: profile,
      update: profile,
    });
  }
}
