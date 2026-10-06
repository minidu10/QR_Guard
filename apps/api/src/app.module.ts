import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { Env, validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PaymentsModule } from './payments/payments.module';
import { QrCodesModule } from './qrcodes/qrcodes.module';
import { ShopsModule } from './shops/shops.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    QrCodesModule,
    PaymentsModule,
  ],
})
export class AppModule {}
