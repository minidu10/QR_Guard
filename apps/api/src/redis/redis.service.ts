import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Env } from '../config/env.validation';

// One shared Redis connection. Connects on the first command.
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super(config.get('REDIS_URL', { infer: true }), { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  onModuleDestroy() {
    this.disconnect();
  }
}

/** All QRGuard keys start with this, so they are easy to find. */
export const redisKey = (...parts: string[]) => ['qrguard', ...parts].join(':');
