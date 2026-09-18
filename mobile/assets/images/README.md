# Image assets

Every file in this folder is currently **stylized placeholder artwork**
(a warm bokeh/gradient treatment using the app's own brand colors from
`src/theme/tokens.ts`), not real photography. They exist so every screen
has a finished, on-brand visual instead of a flat color or an icon glyph
while real photos aren't available yet.

| File | Used by | Notes |
|---|---|---|
| `splash-hero.jpg` | `app/index.tsx` (`LoadingSplash`, via `HeroImage`) | Full-bleed portrait, dark-to-warm vertical gradient so light text reads at the bottom |
| `welcome-hero.jpg` | `app/welcome.tsx` (via `HeroImage`) | Same treatment, slightly warmer/busier to feel more inviting |
| `dog-cover-placeholder.jpg` | `src/components/DogPhoto.tsx` | Landscape; shown whenever a dog has no uploaded cover photo, or a real photo URL fails to load |

## Swapping in real photography

Each file is loaded via a static `require()` at a fixed path — replace
the file in place (same filename, same folder) and no code changes are
needed anywhere. Keep the same aspect ratio as the file you're replacing
so existing crops/`resizeMode="cover"` layouts don't shift:

- `splash-hero.jpg` / `welcome-hero.jpg`: portrait, ~750×1334 (any
  higher-resolution portrait image works — `resizeMode="cover"` crops
  to fill)
- `dog-cover-placeholder.jpg`: landscape, ~800×600

Only use images you have the rights to (owned, commissioned, or under a
license that permits commercial app use) — do not substitute images
sourced without a clear license.
