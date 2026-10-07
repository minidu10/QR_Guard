import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DAY_MS, HOUR_MS, MINUTE_MS, SL_TIME_ZONE, slHour } from '../common/time';
import { Env } from '../config/env.validation';
import { fakeCustomerRef, PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { redisKey, RedisService } from '../redis/redis.service';
import { fakeAmount, steadyCount } from './simulator.logic';

const PROFILE_DAYS = 7;
const MAX_CATCH_UP_MS = DAY_MS;

/** Time (ms) up to which fake payments exist. Set by each tick and by the seed script. */
export const SIM_LAST_RUN_KEY = redisKey('sim', 'last-run');
const pausedKey = (shopId: string) => redisKey('sim', 'paused', shopId);

type SimShop = { shopId: string; merchantId: string };

/**
 * Demo only: keeps fake payments coming in, at each shop's normal rate for the hour.
 * Without it, the seeded history would stop and every shop would look like a "drop".
 * Turn on with PAYMENT_SIMULATOR=true. Never use it with real data.
 */
@Injectable()
export class PaymentSimulator implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentSimulator.name);
  private readonly enabled: boolean;
  // Leftover part of a payment per shop, carried to the next minute.
  private readonly carry = new Map<string, number>();
  private profileCache: { at: number; byShop: Map<string, number[]> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly redis: RedisService,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('PAYMENT_SIMULATOR', { infer: true }) === 'true';
  }

  async onApplicationBootstrap() {
    if (!this.enabled) return;
    this.logger.log('Payment simulator is ON (demo data only)');
    try {
      const added = await this.catchUp();
      if (added > 0) this.logger.log(`Filled the gap since the last run: ${added} payments`);
    } catch (err) {
      this.logger.warn(`Catch-up failed: ${(err as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'payment-simulator' })
  async tick(now = new Date()) {
    if (!this.enabled) return;
    try {
      const [shops, profile] = await Promise.all([this.activeShops(), this.profile(now)]);
      for (const shop of shops) {
        if (await this.isPaused(shop.shopId)) continue;
        const perHour = profile.get(shop.shopId)?.[slHour(now)] ?? 0;
        const step = steadyCount(this.carry.get(shop.shopId) ?? 0, perHour / 60);
        this.carry.set(shop.shopId, step.carry);
        for (let i = 0; i < step.count; i++) {
          await this.payments.record({
            ...shop,
            amount: fakeAmount(),
            customerRef: fakeCustomerRef(),
            status: Math.random() < 0.02 ? 'failed' : 'success',
          });
        }
      }
      await this.redis.set(SIM_LAST_RUN_KEY, String(now.getTime()));
    } catch (err) {
      this.logger.warn(`Simulator tick failed: ${(err as Error).message}`);
    }
  }

  /** Stop fake payments for a shop for a while (demo: "customers pay the scammer"). */
  async pause(shopId: string, minutes: number) {
    await this.redis.set(pausedKey(shopId), '1', 'EX', minutes * 60);
  }

  async resume(shopId: string) {
    await this.redis.del(pausedKey(shopId));
  }

  async isPaused(shopId: string): Promise<boolean> {
    return (await this.redis.exists(pausedKey(shopId))) === 1;
  }

  /** Adds payments for the time the API was not running (up to 24 hours). */
  async catchUp(now = new Date()): Promise<number> {
    const from = await this.lastRun(now);
    const [shops, profile] = await Promise.all([this.activeShops(), this.profile(now)]);
    let added = 0;
    for (const shop of shops) {
      if (await this.isPaused(shop.shopId)) continue;
      let carry = 0;
      const rows = [];
      for (let t = from + MINUTE_MS; t <= now.getTime(); t += MINUTE_MS) {
        const perHour = profile.get(shop.shopId)?.[slHour(new Date(t))] ?? 0;
        const step = steadyCount(carry, perHour / 60);
        carry = step.carry;
        for (let i = 0; i < step.count; i++) {
          rows.push({
            ...shop,
            amount: fakeAmount(),
            customerRef: fakeCustomerRef(),
            status: (Math.random() < 0.02 ? 'failed' : 'success') as 'failed' | 'success',
            createdAt: new Date(t - Math.random() * MINUTE_MS),
          });
        }
      }
      if (rows.length) await this.prisma.payment.createMany({ data: rows });
      added += rows.length;
    }
    await this.redis.set(SIM_LAST_RUN_KEY, String(now.getTime()));
    return added;
  }

  // Where fake payments stop: the last run, or the newest payment (e.g. right after seeding).
  private async lastRun(now: Date): Promise<number> {
    const saved = Number(await this.redis.get(SIM_LAST_RUN_KEY));
    let last = Number.isFinite(saved) && saved > 0 ? saved : 0;
    if (!last) {
      const newest = await this.prisma.payment.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      last = newest?.createdAt.getTime() ?? now.getTime();
    }
    return Math.max(last, now.getTime() - MAX_CATCH_UP_MS);
  }

  // Shops with an active QR code (payments need a merchant id). Newest code per shop.
  private async activeShops(): Promise<SimShop[]> {
    const codes = await this.prisma.qrCode.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: { shopId: true, merchantId: true },
    });
    const byShop = new Map<string, string>();
    for (const c of codes) if (!byShop.has(c.shopId)) byShop.set(c.shopId, c.merchantId);
    return [...byShop].map(([shopId, merchantId]) => ({ shopId, merchantId }));
  }

  // Average successful payments per Sri Lanka hour (0-23) over the last week, per shop.
  // Cached for an hour.
  private async profile(now: Date): Promise<Map<string, number[]>> {
    if (this.profileCache && now.getTime() - this.profileCache.at < HOUR_MS) {
      return this.profileCache.byShop;
    }
    const from = new Date(now.getTime() - PROFILE_DAYS * DAY_MS);
    const rows = await this.prisma.$queryRaw<{ shopId: string; hour: number; avg: number }[]>`
      SELECT shop_id AS "shopId",
             EXTRACT(HOUR FROM created_at AT TIME ZONE ${SL_TIME_ZONE})::int AS hour,
             COUNT(*)::float8 / ${PROFILE_DAYS} AS avg
      FROM payments
      WHERE status = 'success' AND created_at >= ${from} AND created_at < ${now}
      GROUP BY 1, 2`;
    const byShop = new Map<string, number[]>();
    for (const r of rows) {
      const hours = byShop.get(r.shopId) ?? Array.from({ length: 24 }, () => 0);
      hours[r.hour] = r.avg;
      byShop.set(r.shopId, hours);
    }
    this.profileCache = { at: now.getTime(), byShop };
    return byShop;
  }
}
