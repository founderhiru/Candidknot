-- Launch MVP Phase D: minimal notification event log. Additive only —
-- creates one new table and touches nothing existing. No push
-- infrastructure reads/writes this yet — see src/lib/notifications.ts.
--
-- Hand-authored for the same reason as prior migrations (no network
-- access to binaries.prisma.sh in this sandbox). Verify with
-- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema --shadow-database-url <url> --script`
-- in a network-enabled environment before the first real deploy.

-- CreateTable
CREATE TABLE "notification_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_event_userId_createdAt_idx" ON "notification_event"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "notification_event" ADD CONSTRAINT "notification_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
