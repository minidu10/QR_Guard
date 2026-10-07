import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Env } from '../config/env.validation';
import { PrismaClient } from '../generated/prisma/client';

// One shared database client for the whole app.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
        // Keep connections open between requests. A new TLS connection to a remote
        // database (e.g. Supabase) is slow, and a burst of queries would wait for it.
        idleTimeoutMillis: 5 * 60_000,
        keepAlive: true,
        // Fail (instead of waiting forever) when the database cannot be reached.
        connectionTimeoutMillis: 10_000,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
