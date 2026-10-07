import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { AlertWithShop, PaymentDropCheck } from '@qrguard/types';
import { AlertsService } from '../alerts/alerts.service';
import { DAY_MS, HOUR_MS } from '../common/time';
import { Env } from '../config/env.validation';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { redisKey, RedisService } from '../redis/redis.service';
import { checkDrop, dropMessage, dropSeverity } from './payment-drop.logic';

// How often the check runs. Read once at start (cron syntax).
const CHECK_CRON = process.env.DROP_CHECK_CRON || '0 */15 * * * *'; // every 15 minutes

@Injectable()
export class PaymentDropService {
  private readonly logger = new Logger(PaymentDropService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
  ) {}

  @Cron(CHECK_CRON, { name: 'payment-drop-check' })
  async scheduledCheck() {
    try {
      const results = await this.checkAll();
      const drops = results.filter((r) => r.result.drop).length;
      this.logger.log(`Payment drop check: ${results.length} shops, ${drops} drops`);
    } catch (err) {
      this.logger.error(`Payment drop check failed: ${(err as Error).message}`);
    }
  }

  /** Checks every shop and makes alerts for drops. */
  async checkAll(now = new Date()): Promise<PaymentDropCheck[]> {
    const shops = await this.prisma.shop.findMany({ select: { id: true } });
    const counts = await this.windowCounts(now);
    const out: PaymentDropCheck[] = [];
    for (const { id } of shops) out.push(await this.evaluate(id, counts.get(id), now, false));
    return out;
  }

  /** Checks one shop now. `force` makes a new alert even if one was sent in the last hour. */
  async checkShop(shopId: string, opts: { now?: Date; force?: boolean } = {}) {
    const now = opts.now ?? new Date();
    const counts = await this.windowCounts(now, shopId);
    return this.evaluate(shopId, counts.get(shopId), now, opts.force ?? false);
  }

  private async evaluate(
    shopId: string,
    counts: number[] | undefined,
    now: Date,
    force: boolean,
  ): Promise<PaymentDropCheck> {
    const days = this.config.get('DROP_LOOKBACK_DAYS', { infer: true });
    const current = counts?.[0] ?? 0;
    const history = Array.from({ length: days }, (_, i) => counts?.[i + 1] ?? 0);
    const result = checkDrop(current, history, {
      ratio: this.config.get('DROP_RATIO', { infer: true }),
      minNormal: this.config.get('DROP_MIN_NORMAL', { infer: true }),
    });

    let alert: AlertWithShop | null = null;
    if (result.drop && (await this.claimAlert(shopId, force))) {
      alert = await this.alerts.create({
        shopId,
        type: 'PAYMENT_DROP',
        severity: dropSeverity(result.ratio),
        message: dropMessage(result),
        data: { current: result.current, normal: result.normal, ratio: result.ratio },
      });
    }
    return { shopId, result, alert };
  }

  // One drop alert per shop per hour is enough. Redis "set if not set" makes this safe
  // even when two checks run at the same moment. `force` (demo button) always alerts.
  private async claimAlert(shopId: string, force: boolean): Promise<boolean> {
    const key = redisKey('drop-alert', shopId);
    const ttl = HOUR_MS / 1000;
    if (force) {
      await this.redis.set(key, '1', 'EX', ttl);
      return true;
    }
    return (await this.redis.set(key, '1', 'EX', ttl, 'NX')) === 'OK';
  }

  /**
   * Successful payments per shop in the last 60 minutes (index 0) and in the same
   * 60 minutes 1, 2, ... days ago (index 1, 2, ...). One query for all shops.
   */
  private async windowCounts(now: Date, shopId?: string): Promise<Map<string, number[]>> {
    const days = this.config.get('DROP_LOOKBACK_DAYS', { infer: true });
    const from = new Date(now.getTime() - (days + 1) * DAY_MS);
    const rows = await this.prisma.$queryRaw<{ shopId: string; daysAgo: number; count: number }[]>`
      SELECT shop_id AS "shopId",
             FLOOR(EXTRACT(EPOCH FROM (${now}::timestamptz - created_at)) / 86400)::int AS "daysAgo",
             COUNT(*)::int AS count
      FROM payments
      WHERE status = 'success'
        AND created_at <= ${now}::timestamptz
        AND created_at > ${from}::timestamptz
        -- Only the 60 minutes before "now" on each day.
        AND MOD(EXTRACT(EPOCH FROM (${now}::timestamptz - created_at)), 86400) < 3600
        ${shopId ? Prisma.sql`AND shop_id = ${shopId}::uuid` : Prisma.empty}
      GROUP BY 1, 2`;

    const map = new Map<string, number[]>();
    for (const r of rows) {
      const list = map.get(r.shopId) ?? [];
      list[r.daysAgo] = r.count;
      map.set(r.shopId, list);
    }
    return map;
  }
}
