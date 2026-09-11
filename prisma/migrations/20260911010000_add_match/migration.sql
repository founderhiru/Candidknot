-- Launch MVP Phase A: minimal Match model. Additive only — creates one
-- new table and touches nothing existing.
--
-- Hand-authored for the same reason as prior migrations: this sandbox has
-- no network access to binaries.prisma.sh, so `prisma migrate dev` could
-- not generate/validate this file. Verify with
-- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema --shadow-database-url <url> --script`
-- in a network-enabled environment before the first real deploy.

-- CreateTable
CREATE TABLE "match" (
    "id" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "targetDogId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_interestId_key" ON "match"("interestId");

-- CreateIndex
CREATE INDEX "match_senderId_idx" ON "match"("senderId");

-- CreateIndex
CREATE INDEX "match_receiverId_idx" ON "match"("receiverId");

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_targetDogId_fkey" FOREIGN KEY ("targetDogId") REFERENCES "DogProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
