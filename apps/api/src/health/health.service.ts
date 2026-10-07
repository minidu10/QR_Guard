import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthResponse, ServiceStatus } from '@qrguard/types';
import { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';

const TIMEOUT_MS = 2000;

// Checks that every service the API depends on is reachable.
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [database, redis, storage, ai] = await Promise.all([
      this.run('database', () => this.checkDatabase()),
      this.run('redis', () => this.checkRedis()),
      this.run('storage', () => this.checkStorage()),
      this.run('ai', () => this.checkAi()),
    ]);
    const services = { database, redis, storage, ai };
    const allUp = Object.values(services).every((s) => s === 'up');
    return { status: allUp ? 'ok' : 'error', timestamp: new Date().toISOString(), services };
  }

  // Runs one check with a timeout. Any error means "down".
  private async run(name: string, fn: () => Promise<void>): Promise<ServiceStatus> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    });
    try {
      await Promise.race([fn(), timeout]);
      return 'up';
    } catch (err) {
      this.logger.warn(`${name} health check failed: ${(err as Error).message}`);
      return 'down';
    } finally {
      clearTimeout(timer);
    }
  }

  private async checkDatabase() {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis() {
    await this.redis.ping();
  }

  private async checkStorage() {
    await this.storage.ping();
  }

  private async checkAi() {
    const res = await fetch(`${this.config.get('AI_SERVICE_URL', { infer: true })}/health`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  }
}
