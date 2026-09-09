-- CreateTable
CREATE TABLE "DogProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DogProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DogProfile_slug_key" ON "DogProfile"("slug");

-- CreateIndex
CREATE INDEX "DogProfile_breed_idx" ON "DogProfile"("breed");

-- CreateIndex
CREATE INDEX "DogProfile_city_idx" ON "DogProfile"("city");
