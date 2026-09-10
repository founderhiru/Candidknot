// @polsia:shared — edit only through declared slots. Code installed by polsia/template-next@0.3.0.
//
// Typed env via @t3-oss/env-nextjs.
//
// Modules contribute env vars via their manifest `contributions` block.
// The installer regenerates this file's slots between the markers below.
// Hand-editing outside those slots is rejected by the ownership validator.
//
// The `no-secrets-in-client-bundle` validator scans the build output and rejects
// the install if any non-NEXT_PUBLIC_ env name appears in client chunks.

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Prisma is the app's DB client. DATABASE_URL is injected by Render at
    // deploy time when the web service is linked to a Render Postgres
    // instance (see render.yaml). This module ships the client only — the
    // actual Postgres instance is provisioned separately.
    DATABASE_URL: z.string().url(),
    // @polsia:slot env_vars_server start
    // Auth (Phase 2). Secret used by better-auth to sign session cookies —
    // generate with `openssl rand -base64 32`. Never reused across environments.
    SESSION_SECRET: z.string().min(32),
    // Google OAuth ("Continue with Google"). Create credentials at
    // https://console.cloud.google.com/apis/credentials — Authorized
    // redirect URI must be `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    // (e.g. https://canidknot-web.onrender.com/api/auth/callback/google in
    // prod, http://localhost:3000/api/auth/callback/google in dev).
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    // Resend (transactional email — Phase 2 magic-link delivery). In
    // sandbox mode (no verified sending domain yet) Resend only delivers to
    // the account owner's own verified address — see .env.example.
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1).default('CanidKnot <onboarding@resend.dev>'),
    // SMS ("Continue with Mobile" OTP). No vendor is wired in yet — see
    // @/lib/sms. Optional/unset today; "console" (or unset) logs codes to
    // the server console in development and is refused outright in
    // production until a real value + implementation exist.
    SMS_PROVIDER: z.string().min(1).optional(),
    // Object storage (Phase 4 — photos + health passport documents).
    // Cloudflare R2, via the S3-compatible API (@aws-sdk/client-s3) — the
    // shape this repo already reserved for it (see .env.example). The R2
    // endpoint is derived from R2_ACCOUNT_ID; see src/lib/storage.ts.
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    // Public hostname files are served from (no scheme) — also feeds
    // IMAGE_REMOTE_HOSTS for next/image (see next.config.ts).
    R2_PUBLIC_HOSTNAME: z.string().min(1),
    // Mobile (Phase mobile-M1). The Expo app's custom URL scheme, added to
    // better-auth's trustedOrigins so requests/OAuth redirects originating
    // from the app (Origin: "canidknot://") are accepted the same way an
    // http(s) web origin is — see @/lib/auth. Must exactly match the
    // "scheme" value in the Expo app's app.json.
    MOBILE_APP_SCHEME: z.string().min(1).default('canidknot://'),
    // @polsia:slot env_vars_server end
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    // Base for @/lib/api-client + proxy.ts connect-src. Default-empty
    // (unset) means same-origin `/api`; set only for an external API origin.
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    // @polsia:slot env_vars_client start
    // Modules append NEXT_PUBLIC_* env vars here at install time.
    // @polsia:slot env_vars_client end
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    // @polsia:slot env_runtime start
    SESSION_SECRET: process.env.SESSION_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SMS_PROVIDER: process.env.SMS_PROVIDER,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_HOSTNAME: process.env.R2_PUBLIC_HOSTNAME,
    MOBILE_APP_SCHEME: process.env.MOBILE_APP_SCHEME,
    // @polsia:slot env_runtime end
  },
  emptyStringAsUndefined: true,
  // SKIP_ENV_VALIDATION=1 bypasses validation for envless builds (lint/CI/local).
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
