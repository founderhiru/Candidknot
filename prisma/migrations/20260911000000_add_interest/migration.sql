-- Launch MVP: minimal Interest model (Express Interest). Additive only —
-- creates one new table and touches nothing existing (no Phase 2 auth
-- data, no Phase 3 owner/dog data, no Phase 4 photos/health data).
--
-- Hand-authored for the same reason as prior migrations (see
-- prisma/schema/auth.prisma header): this sandbox has no network access
-- to binaries.prisma.sh, so `prisma migrate dev` could not generate/
-- validate this file against the installed Prisma version. Verify with
-- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema --shadow-database-url <url> --script`
-- in a network-enabled environment before the first real deploy.

-- CreateTable
CREATE TABLE "interest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "targetDogId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interest_senderId_targetDogId_key" ON "interest"("senderId", "targetDogId");

-- CreateIndex
CREATE INDEX "interest_targetDogId_idx" ON "interest"("targetDogId");

-- AddForeignKey
ALTER TABLE "interest" ADD CONSTRAINT "interest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest" ADD CONSTRAINT "interest_targetDogId_fkey" FOREIGN KEY ("targetDogId") REFERENCES "DogProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
