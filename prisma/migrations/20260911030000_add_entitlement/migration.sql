-- Launch MVP Phase C: minimal Entitlement model (service/payment
-- foundation). Additive only — creates one new table and touches nothing
-- existing. No payment provider writes to this table yet.
--
-- Hand-authored for the same reason as prior migrations (no network
-- access to binaries.prisma.sh in this sandbox). Verify with
-- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema --shadow-database-url <url> --script`
-- in a network-enabled environment before the first real deploy.

-- CreateTable
CREATE TABLE "entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "scopeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entitlement_userId_service_scopeId_idx" ON "entitlement"("userId", "service", "scopeId");

-- AddForeignKey
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
