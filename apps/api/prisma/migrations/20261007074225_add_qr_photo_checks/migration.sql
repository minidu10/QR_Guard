-- CreateEnum
CREATE TYPE "PhotoResult" AS ENUM ('real', 'tampered');

-- CreateTable
CREATE TABLE "qr_photo_checks" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "image_key" TEXT NOT NULL,
    "result" "PhotoResult" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "model_mode" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_photo_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qr_photo_checks_shop_id_created_at_idx" ON "qr_photo_checks"("shop_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "qr_photo_checks" ADD CONSTRAINT "qr_photo_checks_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
