// @polsia:user-owned — Phase 4: object storage for dog photos and health
// passport documents. Talks to Cloudflare R2 via its S3-compatible API
// (@aws-sdk/client-s3 + @aws-sdk/s3-request-presigner) — the shape this
// repo already reserved for it (see .env.example).
//
// SECURITY MODEL — read before changing:
//   - PHOTOS are public by design (shown on public Discover in Phase 5).
//     uploadPublicObject() returns a permanent url built from
//     R2_PUBLIC_HOSTNAME and that url is persisted on DogPhoto.
//   - HEALTH DOCUMENTS are private. uploadPrivateObject() returns ONLY the
//     storageKey — no url is ever computed or persisted for a
//     HealthDocument row. The only way to read a document's bytes is
//     getSignedDownloadUrl(), which every caller must go through
//     loadOwnedDog() + a record/document ownership check to reach (see
//     the documents/[documentId]/download route). The signed URL expires
//     in DOCUMENT_DOWNLOAD_TTL_SECONDS and is never stored — it's
//     generated fresh on each authenticated download request.
//   - OPERATIONAL REQUIREMENT this code cannot enforce by itself: the R2
//     bucket's public-read mapping (whatever serves R2_PUBLIC_HOSTNAME)
//     must be scoped to ONLY the `dogs/*/photos/*` key prefix — e.g. via a
//     Worker/rule on the custom domain — so that `dogs/*/health-records/*`
//     objects are unreachable by guessing/leaking a URL. This is a bucket
//     configuration step, not something a PutObject call can set alone
//     (R2 has no per-object ACL); see the Phase 4 report for the explicit
//     action item.
import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';

export const DOCUMENT_DOWNLOAD_TTL_SECONDS = 5 * 60; // 5 minutes

const client = new S3Client({
  region: 'auto', // R2 ignores region but the SDK requires a value
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  // R2 (like most non-AWS S3-compatible providers) requires path-style
  // addressing rather than AWS's virtual-hosted-style buckets.
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

function publicUrlFor(storageKey: string): string {
  return `https://${env.R2_PUBLIC_HOSTNAME}/${storageKey}`;
}

async function putObject(
  bucket: string,
  storageKey: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** Uploads a PUBLIC file (dog photos only) and returns its permanent url. */
export async function uploadPublicObject(
  storageKey: string,
  body: Buffer,
  contentType: string,
): Promise<{ storageKey: string; url: string }> {
  await putObject(env.R2_PHOTOS_BUCKET_NAME, storageKey, body, contentType);
  return { storageKey, url: publicUrlFor(storageKey) };
}

/**
 * Uploads a PRIVATE file (health documents only). Deliberately returns no
 * url — callers must never persist a permanent link to a private object.
 * Use getSignedDownloadUrl() to read it back.
 */
export async function uploadPrivateObject(
  storageKey: string,
  body: Buffer,
  contentType: string,
): Promise<{ storageKey: string }> {
  await putObject(env.R2_BUCKET_NAME, storageKey, body, contentType);
  return { storageKey };
}

/**
 * Generates a short-lived signed URL to read a private object. Callers
 * MUST have already verified the requester owns the resource this
 * storageKey belongs to — this function itself does no authorization, it
 * only proves possession of the storageKey (which the caller already
 * confirmed is owned).
 */
export async function getSignedDownloadUrl(
  storageKey: string,
  expiresInSeconds: number = DOCUMENT_DOWNLOAD_TTL_SECONDS,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storageKey });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/** Deletes a file from the bucket. Safe to call on an already-gone key. */
export async function deletePublicObject(storageKey: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_PHOTOS_BUCKET_NAME,
      Key: storageKey,
    }),
  );
}

export async function deletePrivateObject(storageKey: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storageKey,
    }),
  );
}
