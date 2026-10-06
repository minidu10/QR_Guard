import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { GeneratedQrCode, QrCode } from '@qrguard/types';
import { randomInt } from 'node:crypto';
import { Model, Types } from 'mongoose';
import * as QRCodeImage from 'qrcode';
import type { AuthUser } from '../auth/auth.types';
import { ShopDocument } from '../shops/schemas/shop.schema';
import { ShopsService } from '../shops/shops.service';
import { buildMerchantQr } from './emv';
import { QRCode, QRCodeDocument } from './schemas/qrcode.schema';

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
    @InjectModel(QRCode.name) private readonly qrcodes: Model<QRCode>,
    private readonly shops: ShopsService,
  ) {}

  async generate(shopId: Types.ObjectId, user: AuthUser, rotate = false): Promise<GeneratedQrCode> {
    const shop = await this.shops.findById(shopId);
    this.shops.assertCanManage(shop, user);
    if (rotate) {
      await this.qrcodes.updateMany(
        { shopId: shop._id, status: 'active' },
        { status: 'revoked', revokedAt: new Date() },
      );
    }
    const qr = await this.createForShop(shop);
    return this.withImage(qr);
  }

  // Also used by the seed script.
  async createForShop(shop: ShopDocument): Promise<QRCodeDocument> {
    // Ids are random, so a clash is very rare. Try a few times just in case.
    for (let attempt = 0; attempt < 5; attempt++) {
      const merchantId = newMerchantId();
      const qrPayload = buildMerchantQr({
        merchantId,
        merchantName: shop.name,
        merchantCity: cityFromAddress(shop.address),
      });
      try {
        return await this.qrcodes.create({ shopId: shop._id, merchantId, qrPayload });
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err; // 11000 = duplicate key
      }
    }
    throw new ConflictException('Could not create a unique merchant id. Please try again.');
  }

  async revoke(id: Types.ObjectId, user: AuthUser): Promise<QrCode> {
    const qr = await this.qrcodes.findById(id).exec();
    if (!qr) throw new NotFoundException('QR code not found');
    this.shops.assertCanManage(await this.shops.findById(qr.shopId), user);
    if (qr.status !== 'revoked') {
      qr.status = 'revoked';
      qr.revokedAt = new Date();
      await qr.save();
    }
    return qr.toJSON() as unknown as QrCode;
  }

  private async withImage(qr: QRCodeDocument): Promise<GeneratedQrCode> {
    const qrImage = await QRCodeImage.toDataURL(qr.qrPayload, {
      errorCorrectionLevel: 'M',
      width: 512,
    });
    return { ...(qr.toJSON() as unknown as QrCode), qrImage };
  }
}
