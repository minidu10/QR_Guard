import { Injectable, NotFoundException } from '@nestjs/common';
import type { Payment, PaymentSummary } from '@qrguard/types';
import { randomInt } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { DAY_MS, SL_TIME_ZONE, slDayStart } from '../common/time';
import type { Payment as PaymentRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ShopsService } from '../shops/shops.service';
import { buildSummary, type HourRow } from './payments.logic';

// "Normal" = the average of the same hour over this many days.
const TYPICAL_DAYS = 7;

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    shopId: row.shopId,
    merchantId: row.merchantId,
    amount: row.amount,
    customerRef: row.customerRef,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Fake customer reference like "CUST-0042". */
export function fakeCustomerRef(): string {
  return 'CUST-' + randomInt(0, 10000).toString().padStart(4, '0');
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** A fake payment to a merchant id. Only active QRGuard QR codes can be paid. */
  async pay(merchantId: string, amount: number, customerRef?: string): Promise<Payment> {
    const qr = await this.prisma.qrCode.findUnique({ where: { merchantId } });
    if (!qr || qr.status !== 'active') {
      throw new NotFoundException('This QR code is not an active QRGuard merchant');
    }
    return this.record({
      shopId: qr.shopId,
      merchantId,
      amount,
      customerRef: customerRef ?? fakeCustomerRef(),
    });
  }

  /** Saves a payment and sends it to the shop's live dashboard. */
  async record(data: {
    shopId: string;
    merchantId: string;
    amount: number;
    customerRef: string;
    status?: 'success' | 'failed';
    createdAt?: Date;
  }): Promise<Payment> {
    const payment = toPayment(await this.prisma.payment.create({ data }));
    this.realtime.emitPayment(payment);
    return payment;
  }

  async listForShop(shopId: string, user: AuthUser, limit: number): Promise<Payment[]> {
    await this.assertCanView(shopId, user);
    const rows = await this.prisma.payment.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toPayment);
  }

  async summary(shopId: string, user: AuthUser, now = new Date()): Promise<PaymentSummary> {
    await this.assertCanView(shopId, user);
    const todayStart = slDayStart(now);
    const weekStart = new Date(todayStart.getTime() - TYPICAL_DAYS * DAY_MS);
    const [today, lastWeek] = await Promise.all([
      this.countByHour(shopId, todayStart, now),
      this.countByHour(shopId, weekStart, todayStart),
    ]);
    return buildSummary(today, lastWeek, TYPICAL_DAYS);
  }

  // Successful payments per Sri Lanka hour between two times.
  private countByHour(shopId: string, from: Date, to: Date): Promise<HourRow[]> {
    return this.prisma.$queryRaw<HourRow[]>`
      SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE ${SL_TIME_ZONE})::int AS hour,
             COUNT(*)::int AS count,
             COALESCE(SUM(amount), 0)::int AS total
      FROM payments
      WHERE shop_id = ${shopId}::uuid AND status = 'success'
        AND created_at >= ${from} AND created_at < ${to}
      GROUP BY 1`;
  }

  private async assertCanView(shopId: string, user: AuthUser) {
    const shop = await this.shops.findById(shopId);
    this.shops.assertCanManage(shop, user);
  }
}
