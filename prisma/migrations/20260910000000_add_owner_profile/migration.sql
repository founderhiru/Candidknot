-- Phase 3: owner profile (1:1 with user).
--
-- Additive only. Creates one new table and touches nothing existing — no
-- Phase 2 auth data and no DogProfile row (including the 12 demo profiles)
-- is altered by this migration.
--
-- Hand-authored for the same reason as the Phase 2 migration (see
-- prisma/schema/auth.prisma header): this sandbox has no network access to
-- binaries.prisma.sh, so `prisma migrate dev` could not generate/validate
-- this file against the installed Prisma version. Verify with
-- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema --shadow-database-url <url> --script`
-- in a network-enabled environment before the first real deploy.

-- CreateTable
CREATE TABLE "owner_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_profile_userId_key" ON "owner_profile"("userId");

-- AddForeignKey
ALTER TABLE "owner_profile" ADD CONSTRAINT "owner_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
