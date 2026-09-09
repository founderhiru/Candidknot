// @vitest-environment node
//
// Phase 2 explicitly requires the public Discover experience to remain
// unauthenticated. This route had no test at all before Phase 2 — added
// here as the regression baseline, not a pre-existing one.
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const findManyMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { dogProfile: { findMany: findManyMock } },
}));

const FIXTURE_PROFILE = {
  id: 'dog_1',
  slug: 'bodhi-bengaluru',
  name: 'Bodhi',
  breed: 'Labrador Retriever',
  city: 'Bengaluru',
  latitude: 12.9716,
  longitude: 77.5946,
  ageYears: 3,
  sex: 'Male',
  bio: 'Calm and friendly.',
  isVerified: true,
};

describe('GET /api/dog-profiles (public Discover)', () => {
  it('returns 200 with no Authorization header / session — no auth required', async () => {
    findManyMock.mockResolvedValue([FIXTURE_PROFILE]);
    const { GET } = await import('@/app/api/dog-profiles/route');

    // Deliberately no cookie/Authorization header — this must not 401.
    const res = await GET(new Request('http://test/api/dog-profiles'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].slug).toBe('bodhi-bengaluru');
  });

  it('rejects invalid filters with 400, independent of auth', async () => {
    findManyMock.mockResolvedValue([]);
    const { GET } = await import('@/app/api/dog-profiles/route');

    const res = await GET(new Request('http://test/api/dog-profiles?radiusKm=9999'));

    expect(res.status).toBe(400);
  });
});
