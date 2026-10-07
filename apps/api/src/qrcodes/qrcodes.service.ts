import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { GeneratedQrCode } from '@qrguard/types';
import { randomInt } from 'node:crypto';
import * as QRCodeImage from 'qrcode';
import type { AuthUser } from '../auth/auth.types';
import type { QrCode, Shop } from '../generated/prisma/client';
import { isUniqueViolation } from '../prisma/errors';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { buildMerchantQr } from './emv';

/** Random merchant id like "QRG482019376". */
export function newMerchantId(): string {
  return 'QRG' + randomInt(0, 1e9).toString().padStart(9, '0');
}

/** City for the QR: the last part of the address ("12 Main St, Kandy" -> "Kandy"). */
export function cityFromAddress(address: string): string {
  const last = address.split(',').pop()?.trim() ?? '';
  // Drop postal numbers like "Colombo 03" -> "Colombo".
  return last.replace(/\s*\d+$/, '') || 'Sri Lanka';
}

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
  ) {}

  async generate(shopId: string, user: AuthUser, rotate = false): Promise<GeneratedQrCode> {
    const shop = await this.shops.findById(shopId);
    this.shops.assertCanManage(shop, user);
    if (rotate) {
      await this.prisma.qrCode.updateMany({
        where: { shopId: shop.id, status: 'active' },
        data: { status: 'revoked', revokedAt: new Date() },
      });
    }
    const qr = await this.createForShop(shop);
    return this.withImage(qr);
  }

  // Also used by the seed script.
  async createForShop(shop: Pick<Shop, 'id' | 'name' | 'address'>): Promise<QrCode> {
    // Ids are random, so a clash is very rare. Try a few times just in case.
    for (let attempt = 0; attempt < 5; attempt++) {
      const merchantId = newMerchantId();
      const qrPayload = buildMerchantQr({
        merchantId,
        merchantName: shop.name,
        merchantCity: cityFromAddress(shop.address),
      });
      try {
        return await this.prisma.qrCode.create({
          data: { shopId: shop.id, merchantId, qrPayload },
        });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
    throw new ConflictException('Could not create a unique merchant id. Please try again.');
  }

  async revoke(id: string, user: AuthUser): Promise<QrCode> {
    const qr = await this.prisma.qrCode.findUnique({ where: { id }, include: { shop: true } });
    if (!qr) throw new NotFoundException('QR code not found');
    const { shop, ...code } = qr;
    this.shops.assertCanManage(shop, user);
    if (code.status === 'revoked') return code;
    return this.prisma.qrCode.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }

  private async withImage(qr: QrCode): Promise<GeneratedQrCode> {
    const qrImage = await QRCodeImage.toDataURL(qr.qrPayload, {
      errorCorrectionLevel: 'M',
      width: 512,
    });
    return {
      ...qr,
      createdAt: qr.createdAt.toISOString(),
      revokedAt: qr.revokedAt?.toISOString() ?? null,
      qrImage,
    };
  }
}
