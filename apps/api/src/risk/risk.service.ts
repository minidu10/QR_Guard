import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ShopRisk } from '@qrguard/types';
import { HOUR_MS } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';
import { computeRisk, RISK_WINDOW_HOURS } from './risk.logic';

@Injectable()
export class RiskService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RiskService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** The shop's risk right now, with the reasons. */
  async compute(shopId: string, now = new Date()): Promise<ShopRisk> {
    const since = new Date(now.getTime() - RISK_WINDOW_HOURS * HOUR_MS);
    const [shop, alerts, openReports, photo] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId }, select: { verified: true } }),
      this.prisma.alert.findMany({
        where: { shopId, createdAt: { gte: since }, type: { not: 'CUSTOMER_REPORT' } },
        select: { type: true, createdAt: true },
      }),
      this.prisma.report.findMany({
        where: { shopId, createdAt: { gte: since }, status: { in: ['open', 'reviewing'] } },
        select: { createdAt: true },
      }),
      this.prisma.qrPhotoCheck.findFirst({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    if (!shop) throw new NotFoundException('Shop not found');
    const risk = computeRisk({
      now,
      verified: shop.verified,
      alerts,
      openReports,
      lastPhotoAt: photo?.createdAt ?? null,
    });
    return { shopId, ...risk, updatedAt: now.toISOString() };
  }

  /** Works out the risk again and saves the score on the shop. */
  async recompute(shopId: string): Promise<ShopRisk> {
    const risk = await this.compute(shopId);
    await this.prisma.shop.update({ where: { id: shopId }, data: { riskScore: risk.score } });
    return risk;
  }

  // Old warning signs fade over time, so update every shop each hour.
  @Cron(CronExpression.EVERY_HOUR, { name: 'risk-update' })
  async recomputeAll() {
    const shops = await this.prisma.shop.findMany({ select: { id: true } });
    for (const { id } of shops) await this.recompute(id);
    return shops.length;
  }

  onApplicationBootstrap() {
    void this.recomputeAll().catch((err: Error) =>
      this.logger.warn(`Could not update risk scores: ${err.message}`),
    );
  }
}
