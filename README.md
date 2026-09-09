# CanidKnot

Verified, health-first breeding connections for India's responsible dog owners.

This repository originated from a Polsia-generated Next.js scaffold; it now
runs independently, with infrastructure on Render and a Render-managed
PostgreSQL database, maintained directly rather than through any platform
module-installer workflow.

## Stack

- Next.js 16 App Router, React 19, TypeScript (strict), Tailwind 4.
- shadcn/ui primitive set in `src/components/ui/**`, `next-themes`, sonner toasts.
- Prisma 6 + PostgreSQL. `prisma/schema/_base.prisma` holds the datasource and
  generator only; feature schema files add models alongside it.
- Biome for lint/format, Vitest for unit tests.
- No Server Actions. All data and mutations go through `/api/*` route
  handlers, called from client components via `src/lib/api-client.ts`.

## Data Plane Pattern

Product pages are client components. They call route handlers through
`apiFetch`, passing a shared Zod schema that validates the response at
runtime.

Each resource has one shared contract in `src/lib/contracts/<resource>.ts`.
The route handler validates request and response shapes with that contract,
and the client imports the same schema — so a shape mismatch between client
and server fails loudly (a `schema.parse` throw) instead of drifting silently.

Validation errors from route handlers use:

```ts
{ errors: { fieldName: 'Message' } }
```

Client forms map those errors with `applyServerErrors` (`src/lib/forms.ts`).
Transient success or unexpected-failure feedback uses `toast` from `sonner`.

Keep new features in this same shape:

- Routes: `src/app/(custom)/<feature>/page.tsx`
- API handlers: `src/app/api/<resource>/route.ts`
- Contracts: `src/lib/contracts/<resource>.ts`
- Custom components: `src/components/custom/<feature>.tsx`

This pattern is deliberately mobile-friendly: an Expo app can call the same
`/api/*` endpoints with the same contracts, with no web-specific coupling.

## Directory Guide

```text
.
├── prisma/
│   ├── schema/_base.prisma           Datasource + generator only
│   ├── schema/<feature>.prisma       App models, one file per feature
│   └── migrations/                   Versioned migrations (prisma migrate)
├── src/
│   ├── app/
│   │   ├── (setup)/page.tsx          Home page (marketing/landing)
│   │   ├── (custom)/<feature>/       App route groups
│   │   ├── api/<resource>/route.ts   API route handlers
│   │   ├── health/route.ts           Deploy healthcheck
│   │   ├── layout.tsx                Root layout and providers
│   │   └── globals.css               Tailwind theme and brand tokens
│   ├── components/
│   │   ├── ui/                       shadcn primitives
│   │   └── custom/                   App-specific compositions
│   ├── lib/
│   │   ├── api-client.ts             Client transport helper
│   │   ├── brand.ts                  Product name/description
│   │   ├── contracts/<resource>.ts   Shared zod contracts
│   │   ├── csp.ts                    CSP builder
│   │   ├── db.ts                     Prisma singleton
│   │   ├── env.ts                    Typed env schema
│   │   ├── forms.ts                  Server error mapping
│   │   ├── nav.ts                    App navigation config
│   │   └── seed.ts                   Idempotent startup seed data
│   └── instrumentation.ts            Server-startup hook (runs seed())
├── tests/unit/                       Vitest unit tests
├── next.config.ts                    Next config and security headers
├── proxy.ts                          CSP nonce + middleware chain
├── render.yaml                       Render Blueprint (web service + Postgres)
└── prisma.config.ts                  Points the Prisma CLI at prisma/schema/
```

## Database & Migrations

Schema changes are versioned Prisma migrations, applied via
`npm run db:migrate:deploy` (`prisma migrate deploy`) — **never** via
`prisma db push` in production, and never as a side effect of the app booting.
`src/instrumentation.ts` only seeds idempotent reference data on server start;
it assumes the schema already exists.

- Local development: `npm run db:migrate:dev` (creates and applies a new
  migration against your local database, prompting for a name).
- Production: `render.yaml` runs `npm run db:migrate:deploy` as the Render
  **Pre-Deploy Command** — it completes before the new instance starts serving
  traffic, and a failure blocks the deploy instead of shipping a broken schema.

### Fresh database, no baseline needed

Render Postgres for this project is a **brand-new, empty database** — the
previous Polsia-hosted Postgres instance is not being restored into it. A
database export was taken from that previous instance for private, offline
reference only (it is not part of this repository and is not committed
anywhere). Analysis of that export confirmed:

- It held 4 tables, but only 12 rows total, all of them in `DogProfile`.
- Those 12 rows match `src/lib/seed.ts`'s demo data exactly, field for field —
  they are reproducible seed data, not unique production data.
- The other 3 tables (`MockOtpChallenge`, `MockOwnerSession`, `OwnerProfile`,
  plus a `MockKycStatus` enum) held zero rows. They were an earlier,
  abandoned mock-auth/owner-onboarding scaffold that was never represented in
  this repo's Prisma schema and is not being carried forward — real
  authentication and owner-profile models will be designed properly in a
  later phase instead.

Because nothing worth preserving lives outside `DogProfile`, and that data is
fully reproducible from `seed.ts`, the correct flow for a new database needs
**no baseline / `migrate resolve` step at all**:

1. Create a new, empty Render Postgres instance.
2. Point `DATABASE_URL` at it (via `render.yaml`'s `fromDatabase` wiring).
3. Render's Pre-Deploy Command runs `npm run db:migrate:deploy`.
4. `prisma/migrations/20260909000000_init_dog_profile` applies cleanly against
   the empty database, creating the `DogProfile` table — no conflict, because
   nothing exists there yet.
5. The application boots; `src/instrumentation.ts` runs the existing
   idempotent `seed()`.
6. The same 12 demo `DogProfile` rows are recreated automatically.

## Deployment (Render)

`render.yaml` defines a Render Blueprint: a Node web service plus a
Render-managed PostgreSQL instance.

1. In the Render dashboard: **New +** → **Blueprint**, point it at this repo.
2. Render provisions a brand-new, empty `canidknot-db` (Postgres) and
   `canidknot-web`, wiring `DATABASE_URL` from the database to the web
   service automatically.
3. Set `NEXT_PUBLIC_APP_URL` (and `SEO_INDEXABLE=true`, only on the real
   production service) in the Render dashboard — these are marked `sync: false`
   in the blueprint so they aren't hardcoded in Git.
4. Push to the connected branch; Render runs `preDeployCommand`
   (`prisma migrate deploy`) against the empty database, then starts the
   service. No baseline step is needed — see "Fresh database, no baseline
   needed" above.

## Local Development

```bash
npm install
npm run typecheck
npm run lint
npm run test
SKIP_ENV_VALIDATION=1 npm run dev
```

`npm run dev` and `npm run build` validate `DATABASE_URL` and
`NEXT_PUBLIC_APP_URL` when `SKIP_ENV_VALIDATION` is not set. On a local clone
without a provisioned database, either set the required vars in `.env.local`
(see `.env.example`) or prefix the command with `SKIP_ENV_VALIDATION=1`.

`typecheck`, `lint`, and `test` do not require env vars or a database
connection.

## Security Headers & CSP

`next.config.ts` sets baseline response headers on every route:

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`

`proxy.ts` sets a per-request Content Security Policy. `script-src` stays
strict with a nonce and `strict-dynamic` (no `unsafe-inline`/`eval` in
production); `style-src` allows inline styles so Radix/shadcn runtime
positioning works. `tests/unit/csp.test.ts` locks this posture.

## Versions

- Next.js 16.2.6, App Router
- React 19.2.7
- Tailwind CSS 4.3.0, CSS-first `@theme`
- shadcn/ui New York style
- sonner 2.0.7
- TypeScript 5.5.4, strict mode
- Biome 2.3.1, lint and format
- Vitest 3.2.6
- Prisma 6.19.3
- Node >=20.18.1

Security `overrides` in `package.json` pin patched transitive dependency
versions that direct framework pins cannot reach on their own.

## Known Placeholders

CanidKnot does not yet have a business email or domain. The three homepage
contact CTAs (`src/app/(setup)/page.tsx`) are disabled "(coming soon)"
buttons, and the "Join the network" mailto entry has been removed from
`src/lib/nav.ts`, rather than pointing at an invented or borrowed address.
Once a real contact email/domain exists, re-enable those CTAs and the nav
entry with the real address.

## License

MIT. See [LICENSE](./LICENSE).
