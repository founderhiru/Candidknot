// Next.js server-startup hook.
//
// Next calls register() ONCE when the server process boots. We use it to run the
// app's idempotent startup seed AFTER the schema is applied: on Render, the
// service's Pre-Deploy Command runs `npm run db:migrate:deploy` (versioned
// `prisma migrate deploy`, NOT `db push`) before the new instance ever starts
// serving traffic, so by the time this fires the tables already exist. Schema
// changes only ever happen via that explicit, reviewable pre-deploy step —
// never as a side effect of the app booting. Put seed logic in src/lib/seed.ts
// (user-owned) — this file only owns the correctness envelope that must not
// be gotten wrong:
//   - Node-runtime guard: register() ALSO fires for the edge runtime, where Prisma
//     cannot run, so we return early there and never pull server-only code into an
//     edge bundle.
//   - fail-open: a throwing seed is logged and swallowed, never re-thrown, so a bad
//     seed can never stop the server from booting (a failure in the `start` chain
//     would). Seed failures degrade gracefully.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { seed } = await import('@/lib/seed');
    await seed();
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: startup diagnostics — the seed failed but the server still boots.
    console.error('[canidknot] startup seed failed:', error);
  }
}
