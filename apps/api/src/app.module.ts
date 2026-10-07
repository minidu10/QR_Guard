import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PaymentsModule } from './payments/payments.module';
import { PhotoChecksModule } from './photo-checks/photo-checks.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrCodesModule } from './qrcodes/qrcodes.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ScanModule } from './scan/scan.module';
import { ShopsModule } from './shops/shops.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Rate limits for public routes (used with ThrottlerGuard on each route).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    PrismaModule,
    RealtimeModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    QrCodesModule,
    AlertsModule,
    ScanModule,
    PaymentsModule,
    PhotoChecksModule,
  ],
})
export class AppModule {}
