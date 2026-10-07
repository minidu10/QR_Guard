-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('safe', 'warning');

-- CreateEnum
CREATE TYPE "ScanReason" AS ENUM ('OK', 'NOT_PAYMENT_QR', 'BAD_CHECKSUM', 'UNKNOWN_MERCHANT', 'REVOKED_QR', 'WRONG_SHOP');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('SCAN_MISMATCH', 'TAMPER_DETECTED', 'PAYMENT_DROP', 'CUSTOMER_REPORT');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "scan_checks" (
    "id" UUID NOT NULL,
    "shop_id" UUID,
    "qr_code_id" UUID,
    "merchant_id" TEXT,
    "result" "ScanResult" NOT NULL,
    "reason" "ScanReason" NOT NULL,
    "user_id" UUID,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_checks_shop_id_created_at_idx" ON "scan_checks"("shop_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "scan_checks_created_at_idx" ON "scan_checks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "alerts_shop_id_created_at_idx" ON "alerts"("shop_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "scan_checks" ADD CONSTRAINT "scan_checks_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_checks" ADD CONSTRAINT "scan_checks_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_checks" ADD CONSTRAINT "scan_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
