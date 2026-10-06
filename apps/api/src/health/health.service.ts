import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { HealthResponse, ServiceStatus } from '@qrguard/types';
import Redis from 'ioredis';
import { Connection } from 'mongoose';
import { Env } from '../config/env.validation';

const TIMEOUT_MS = 2000;

// Checks that every service the API depends on is reachable.
@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis: Redis;
  private readonly s3: S3Client;

  constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }) || undefined,
      region: config.get('S3_REGION', { infer: true }),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }) === 'true',
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  async check(): Promise<HealthResponse> {
    const [mongo, redis, storage, ai] = await Promise.all([
      this.run('mongo', () => this.checkMongo()),
      this.run('redis', () => this.checkRedis()),
      this.run('storage', () => this.checkStorage()),
      this.run('ai', () => this.checkAi()),
    ]);
    const services = { mongo, redis, storage, ai };
    const allUp = Object.values(services).every((s) => s === 'up');
    return { status: allUp ? 'ok' : 'error', timestamp: new Date().toISOString(), services };
  }

  async onModuleDestroy() {
    this.redis.disconnect();
    this.s3.destroy();
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

  private async checkMongo() {
    if (!this.mongo.db) throw new Error('not connected');
    await this.mongo.db.admin().ping();
  }

  private async checkRedis() {
    if (this.redis.status === 'wait') await this.redis.connect();
    await this.redis.ping();
  }

  private async checkStorage() {
    await this.s3.send(
      new HeadBucketCommand({ Bucket: this.config.get('S3_BUCKET', { infer: true }) }),
    );
  }

  private async checkAi() {
    const res = await fetch(`${this.config.get('AI_SERVICE_URL', { infer: true })}/health`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  }
}
