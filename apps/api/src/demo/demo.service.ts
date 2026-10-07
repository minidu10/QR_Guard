import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentDropCheck } from '@qrguard/types';
import { HOUR_MS } from '../common/time';
import { PaymentDropService } from '../payment-drop/payment-drop.service';
import { PaymentSimulator } from '../payment-drop/payment-simulator.service';
import { fakeAmount } from '../payment-drop/simulator.logic';
import { fakeCustomerRef, PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';

// Buttons for the live presentation. Admin only. Works on fake data only.
@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
    private readonly payments: PaymentsService,
    private readonly drop: PaymentDropService,
    private readonly simulator: PaymentSimulator,
  ) {}

  /**
   * "A scammer's QR took this shop's customers for the last hour":
   * removes the last hour's payments, pauses new ones, and runs the drop check now.
   */
  async simulatePaymentDrop(shopId: string): Promise<PaymentDropCheck & { removed: number }> {
    await this.shops.findById(shopId);
    const now = new Date();
    const { count: removed } = await this.prisma.payment.deleteMany({
      where: { shopId, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
    });
    await this.simulator.pause(shopId, 60);
    const check = await this.drop.checkShop(shopId, { now, force: true });
    return { ...check, removed };
  }

  /** Adds fake payments right now (they show live on the dashboard). */
  async addPayments(shopId: string, count: number): Promise<{ created: number }> {
    await this.shops.findById(shopId);
    const qr = await this.prisma.qrCode.findFirst({
      where: { shopId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    if (!qr) throw new NotFoundException('This shop has no active QR code');
    await this.simulator.resume(shopId);
    for (let i = 0; i < count; i++) {
      await this.payments.record({
        shopId,
        merchantId: qr.merchantId,
        amount: fakeAmount(),
        customerRef: fakeCustomerRef(),
      });
    }
    return { created: count };
  }

  /** Back to normal: the simulator adds payments for this shop again. */
  async resume(shopId: string): Promise<{ paused: boolean }> {
    await this.shops.findById(shopId);
    await this.simulator.resume(shopId);
    return { paused: false };
  }
}
