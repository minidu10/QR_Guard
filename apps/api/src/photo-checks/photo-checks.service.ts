import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { PhotoCheck } from '@qrguard/types';
import { randomUUID } from 'node:crypto';
import { AiService } from '../ai/ai.service';
import { AlertsService } from '../alerts/alerts.service';
import type { AuthUser } from '../auth/auth.types';
import type { QrPhotoCheck } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { StorageService } from '../storage/storage.service';
import { detectImageType } from './image-type';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** The parts of an uploaded file (from multer) that we use. */
export interface UploadedPhoto {
  buffer: Buffer;
  originalname: string;
}

export function toPhotoCheck(row: QrPhotoCheck): PhotoCheck {
  return {
    id: row.id,
    shopId: row.shopId,
    result: row.result,
    confidence: row.confidence,
    modelMode: row.modelMode === 'real' ? 'real' : 'mock',
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PhotoChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
    private readonly alerts: AlertsService,
    private readonly ai: AiService,
    private readonly storage: StorageService,
  ) {}

  /** The owner's daily photo of the QR stand: ask the AI, save the result, alert if tampered. */
  async check(
    shopId: string,
    user: AuthUser,
    file: UploadedPhoto | undefined,
  ): Promise<PhotoCheck> {
    const shop = await this.shops.findById(shopId);
    this.shops.assertCanManage(shop, user);
    if (!file?.buffer?.length) throw new BadRequestException('Add a photo of your QR stand.');
    const type = detectImageType(file.buffer);
    if (!type) throw new UnsupportedMediaTypeException('Use a JPEG, PNG or WebP photo.');

    const prediction = await this.ai.predictTamper(file.buffer, file.originalname, type.mime);

    const imageKey = `photo-checks/${shop.id}/${randomUUID()}.${type.ext}`;
    await this.storage.put(imageKey, file.buffer, type.mime);
    const row = await this.prisma.qrPhotoCheck.create({
      data: {
        shopId: shop.id,
        imageKey,
        result: prediction.label,
        confidence: prediction.confidence,
        modelMode: prediction.mode,
      },
    });

    if (row.result === 'tampered') {
      await this.alerts.create({
        shopId: shop.id,
        type: 'TAMPER_DETECTED',
        severity: 'high',
        message: `Your QR stand photo looks tampered (${Math.round(row.confidence * 100)}% sure). Check the sticker now. If it is not yours, remove it and make a new QR code.`,
        data: { photoCheckId: row.id, confidence: row.confidence },
      });
    }
    return toPhotoCheck(row);
  }

  async listForShop(shopId: string, user: AuthUser, limit: number): Promise<PhotoCheck[]> {
    const shop = await this.shops.findById(shopId);
    this.shops.assertCanManage(shop, user);
    const rows = await this.prisma.qrPhotoCheck.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toPhotoCheck);
  }

  async image(id: string, user: AuthUser) {
    const row = await this.prisma.qrPhotoCheck.findUnique({
      where: { id },
      include: { shop: true },
    });
    if (!row) throw new NotFoundException('Photo not found');
    this.shops.assertCanManage(row.shop, user);
    return this.storage.get(row.imageKey);
  }
}
