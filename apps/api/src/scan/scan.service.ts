import { Injectable } from '@nestjs/common';
import type { ScanResponse, ShopSummary } from '@qrguard/types';
import { AlertsService } from '../alerts/alerts.service';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { parseMerchantQr } from '../qrcodes/emv';
import { ShopsService } from '../shops/shops.service';
import { ScanDto } from './dto/scan.dto';
import { alertTarget, decideScan, ownerAlertMessage, scanMessage } from './scan.logic';

// Shops within this distance (metres) count as "where the customer is".
const SCAN_RADIUS_M = 150;

const summary = (s: ShopSummary): ShopSummary => ({
  id: s.id,
  name: s.name,
  address: s.address,
  verified: s.verified,
});

@Injectable()
export class ScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
    private readonly alerts: AlertsService,
  ) {}

  async scan(dto: ScanDto, user?: AuthUser): Promise<ScanResponse> {
    const parsed = parseMerchantQr(dto.qrPayload);
    const qr = parsed?.merchantId
      ? await this.prisma.qrCode.findUnique({
          where: { merchantId: parsed.merchantId },
          include: { shop: true },
        })
      : null;

    // Where is the customer? The shop they picked, or the shops around them.
    const picked = Boolean(dto.shopId);
    let around: ShopSummary[] = [];
    if (dto.shopId) {
      around = [await this.shops.findById(dto.shopId)];
    } else if (dto.lat !== undefined && dto.lng !== undefined) {
      around = await this.shops.findNearby({ lat: dto.lat, lng: dto.lng, radius: SCAN_RADIUS_M });
    }

    const match = qr ? { shopId: qr.shopId, status: qr.status } : null;
    const decision = decideScan({ parsed, match, expectedShopIds: around.map((s) => s.id) });
    // The shop the customer is at: the picked one, the QR's shop if it is close, or the nearest.
    const expectedShop = picked
      ? around[0]
      : (around.find((s) => s.id === qr?.shopId) ?? around[0] ?? null);

    const scan = await this.prisma.scanCheck.create({
      data: {
        shopId: expectedShop?.id ?? null,
        qrCodeId: qr?.id ?? null,
        merchantId: parsed?.merchantId ?? null,
        result: decision.safe ? 'safe' : 'warning',
        reason: decision.reason,
        userId: user ? await this.existingUserId(user.id) : null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
      },
    });

    const target = alertTarget({
      decision,
      match,
      expectedShopId: expectedShop?.id ?? null,
      pickedByCustomer: picked,
    });
    if (target) {
      await this.alerts.create({
        shopId: target.shopId,
        type: 'SCAN_MISMATCH',
        severity: target.severity,
        message: ownerAlertMessage(decision.reason, {
          pickedByCustomer: picked,
          merchantId: parsed?.merchantId,
          otherShop: qr?.shop.name,
        }),
        data: {
          scanId: scan.id,
          reason: decision.reason,
          merchantId: parsed?.merchantId ?? null,
          qrMerchantName: parsed?.merchantName ?? null,
        },
      });
    }

    return {
      scanId: scan.id,
      safe: decision.safe,
      reason: decision.reason,
      message: scanMessage(decision.reason, {
        shop: qr?.shop.name,
        expectedShop: expectedShop?.name,
      }),
      shop: qr ? summary(qr.shop) : null,
      expectedShop: expectedShop ? summary(expectedShop) : null,
      qrMerchantName: parsed?.merchantName ?? null,
      merchantId: parsed?.merchantId ?? null,
    };
  }

  // A token can outlive its user (e.g. after re-seeding). Only link users that exist.
  private async existingUserId(id: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    return user?.id ?? null;
  }
}
