-- PostGIS gives us fast location searches. Supabase has it built in; this turns it on.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'owner', 'admin');

-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'customer',
    "refresh_token_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    -- Made by the database from lat/lng, so it is always correct.
    "location" geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography) STORED,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "status" "QrStatus" NOT NULL DEFAULT 'active',
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "customer_ref" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'success',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "shops_owner_id_idx" ON "shops"("owner_id");

-- CreateIndex
CREATE INDEX "shops_location_idx" ON "shops" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_merchant_id_key" ON "qr_codes"("merchant_id");

-- CreateIndex
CREATE INDEX "qr_codes_shop_id_idx" ON "qr_codes"("shop_id");

-- CreateIndex
CREATE INDEX "payments_shop_id_created_at_idx" ON "payments"("shop_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
