// Mobile (Phase mobile-M2) — pure validation, kept free of RN imports so it
// can be unit-tested directly.

// The backend's own city→lat/lng lookup (src/app/api/dog-profiles/route.ts,
// CITY_CENTERS) is server-only route logic, not exposed via any endpoint —
// there is no geocoding API to call. DogProfileWrite requires real
// latitude/longitude, and Discover's distance search only works for cities
// this exact list matches. Mirroring the same six cities (and their exact
// coordinates) here — rather than free-text city entry — is what keeps a
// mobile-created dog's location usable by the existing Discover logic.
// Keep in sync with CITY_CENTERS if that list ever changes.
export const CITY_OPTIONS = [
  { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
  { name: "Delhi NCR", latitude: 28.6139, longitude: 77.209 },
  { name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
  { name: "Hyderabad", latitude: 17.385, longitude: 78.4867 },
  { name: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { name: "Chennai", latitude: 13.0827, longitude: 80.2707 },
] as const;

export type CityOption = (typeof CITY_OPTIONS)[number];

export function findCityOption(name: string): CityOption | undefined {
  return CITY_OPTIONS.find((option) => option.name === name);
}

export const SEX_OPTIONS = ["Male", "Female"] as const;
export type SexOption = (typeof SEX_OPTIONS)[number];

export interface DogFormValues {
  name: string;
  breed: string;
  city: string;
  sex: string;
  ageYears: string; // kept as the raw text-input value; parsed at validation time
  bio: string;
}

export interface DogFormErrors {
  name?: string;
  breed?: string;
  city?: string;
  sex?: string;
  ageYears?: string;
  bio?: string;
}

/**
 * Mirrors the backend's DogProfileWrite constraints (see
 * src/lib/contracts/dog-profiles.ts) so the form fails the same way the API
 * would, before ever making a network request.
 */
export function validateDogForm(values: DogFormValues): DogFormErrors {
  const errors: DogFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Name is required";
  else if (name.length > 60) errors.name = "Name is too long";

  const breed = values.breed.trim();
  if (!breed) errors.breed = "Breed is required";
  else if (breed.length > 80) errors.breed = "Breed is too long";

  if (!findCityOption(values.city)) {
    errors.city = "Choose a city";
  }

  const sex = values.sex.trim();
  if (!sex) errors.sex = "Sex is required";

  const age = Number(values.ageYears);
  if (values.ageYears.trim() === "" || Number.isNaN(age)) {
    errors.ageYears = "Age is required";
  } else if (!Number.isInteger(age) || age < 0) {
    errors.ageYears = "Age must be 0 or more";
  } else if (age > 30) {
    errors.ageYears = "Age is too high";
  }

  const bio = values.bio.trim();
  if (!bio) errors.bio = "Tell us a bit about your dog";
  else if (bio.length > 1000) errors.bio = "Bio is too long";

  return errors;
}

export function isDogFormValid(errors: DogFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
