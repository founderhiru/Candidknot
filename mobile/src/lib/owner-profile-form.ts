// Mobile (Phase mobile-M2) — pure validation for the Owner Profile form.
// Mirrors two independent backend write targets:
//   - `name` -> better-auth's own updateUser (User.name — see auth-client.ts)
//   - `city`/`bio` -> OwnerProfileWrite (src/lib/contracts/owner-profile.ts)
// There is no single combined endpoint for these; validation is combined
// here only because the form presents them together.

export interface OwnerProfileFormValues {
  name: string;
  city: string;
  bio: string;
}

export interface OwnerProfileFormErrors {
  name?: string;
  city?: string;
  bio?: string;
}

export function validateOwnerProfileForm(
  values: OwnerProfileFormValues,
): OwnerProfileFormErrors {
  const errors: OwnerProfileFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Name is required";

  const city = values.city.trim();
  if (!city) errors.city = "City is required";
  else if (city.length > 120) errors.city = "City is too long";

  const bio = values.bio.trim();
  if (!bio) errors.bio = "Bio is required";
  else if (bio.length > 1000) errors.bio = "Bio is too long";

  return errors;
}

export function isOwnerProfileFormValid(
  errors: OwnerProfileFormErrors,
): boolean {
  return Object.keys(errors).length === 0;
}
