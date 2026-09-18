# Image assets

Every file in this folder is currently **stylized flat-illustration
artwork** — genuinely recognizable as a dog (simple sitting-dog
character, brand-colored collar), not a photograph and not an abstract
gradient. There is no image-generation tool or licensed photo source
available in this project's environment, so hand-drawn illustration is
the honest option that's actually achievable here — a real photo still
needs to come from you (owned, commissioned, or properly licensed).

| File / folder | Used by | Notes |
|---|---|---|
| `splash-hero.jpg` | `app/index.tsx` (`LoadingSplash`, via `HeroImage`) | Full-bleed portrait; a single dog illustration on a dark-to-warm vertical gradient so light text reads at the bottom |
| `welcome-hero.jpg` | `app/welcome.tsx` (via `HeroImage`) | Same treatment, dog + a simple abstract owner silhouette reaching toward it |
| `dog-cover-placeholder.jpg` | `src/components/DogPhoto.tsx` (final fallback tier) | Landscape; shown only when a dog has no `demoKey` at all (see `src/lib/demo-photos.ts`) |
| `demo-dogs/demo-dog-1.jpg` … `demo-dog-6.jpg` | `src/lib/demo-photos.ts` | Six visually-distinct illustrated dogs (different coat colors/ear styles), deterministically assigned per dog by `getDemoPhotoForKey()` — same dog always gets the same one |

## Swapping in real photography

Each file is loaded via a static `require()` at a fixed path — replace
the file in place (same filename, same folder) and no code changes are
needed anywhere. Keep the same aspect ratio so existing crops/
`resizeMode="cover"` layouts don't shift:

- `splash-hero.jpg` / `welcome-hero.jpg`: portrait, ~750×1334
- `dog-cover-placeholder.jpg` / `demo-dogs/*.jpg`: landscape, ~800×600

You can replace anywhere from one to all six `demo-dogs/*.jpg` files
independently — `getDemoPhotoForKey()` doesn't care what's actually in
each file, only that all six exist.

Only use images you have the rights to (owned, commissioned, or under a
license that permits commercial app use) — do not substitute images
sourced without a clear license.
