-- Phase 4: dog photos + health passport (structured records + documents).
--
-- Additive only. Creates three new tables and touches nothing existing —
-- no Phase 2 auth data, no Phase 3 owner/dog data (including the 12 demo
-- DogProfile rows) is altered by this migration.
--
-- Hand-authored for the same reason as the Phase 2/3 migrations (see
-- prisma/schema/auth.prisma header): this sandbox has no network access to
-- binaries.prisma.sh, so `prisma migrate dev` could not generate/validate
-- this file against the installed Prisma version. Verify with
-- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema --shadow-database-url <url> --script`
-- in a network-enabled environment before the first real deploy.

-- CreateTable
CREATE TABLE "dog_photo" (
    "id" TEXT NOT NULL,
    "dogId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dog_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_record" (
    "id" TEXT NOT NULL,
    "dogId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "vetName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_document" (
    "id" TEXT NOT NULL,
    "healthRecordId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dog_photo_dogId_idx" ON "dog_photo"("dogId");

-- CreateIndex
CREATE INDEX "health_record_dogId_idx" ON "health_record"("dogId");

-- CreateIndex
CREATE INDEX "health_document_healthRecordId_idx" ON "health_document"("healthRecordId");

-- AddForeignKey
ALTER TABLE "dog_photo" ADD CONSTRAINT "dog_photo_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "DogProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_record" ADD CONSTRAINT "health_record_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "DogProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_document" ADD CONSTRAINT "health_document_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "health_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
