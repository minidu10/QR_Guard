import { Injectable, NotFoundException } from '@nestjs/common';
import type { Alert, AlertType, AlertWithShop, Severity } from '@qrguard/types';
import type { AuthUser } from '../auth/auth.types';
import { Prisma, type Alert as AlertRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';

export interface NewAlert {
  shopId: string;
  type: AlertType;
  severity: Severity;
  message: string;
  data?: Record<string, unknown>;
}

/** Database row -> API shape. */
export function toAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    shopId: row.shopId,
    type: row.type,
    severity: row.severity,
    message: row.message,
    data: (row.data as Record<string, unknown> | null) ?? null,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
  ) {}

  async create(input: NewAlert): Promise<Alert> {
    const row = await this.prisma.alert.create({
      data: { ...input, data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined },
    });
    return toAlert(row);
  }

  async listForShop(
    shopId: string,
    user: AuthUser,
    opts: { unread?: boolean; limit: number },
  ): Promise<Alert[]> {
    const shop = await this.shops.findById(shopId);
    this.shops.assertCanManage(shop, user);
    const rows = await this.prisma.alert.findMany({
      where: { shopId, ...(opts.unread ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
    });
    return rows.map(toAlert);
  }

  /** All shops (admin view), newest first. */
  async listAll(opts: {
    type?: AlertType;
    unread?: boolean;
    limit: number;
  }): Promise<AlertWithShop[]> {
    const rows = await this.prisma.alert.findMany({
      where: {
        ...(opts.type ? { type: opts.type } : {}),
        ...(opts.unread ? { read: false } : {}),
      },
      include: { shop: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
    });
    return rows.map(({ shop, ...row }) => ({ ...toAlert(row), shopName: shop.name }));
  }

  async markRead(id: string, user: AuthUser): Promise<Alert> {
    const alert = await this.prisma.alert.findUnique({ where: { id }, include: { shop: true } });
    if (!alert) throw new NotFoundException('Alert not found');
    this.shops.assertCanManage(alert.shop, user);
    const row = await this.prisma.alert.update({ where: { id }, data: { read: true } });
    return toAlert(row);
  }
}
