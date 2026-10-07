import { Module } from '@nestjs/common';
import { RiskModule } from '../risk/risk.module';
import { ShopsModule } from '../shops/shops.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [ShopsModule, RiskModule],
  controllers: [AdminController],
})
export class AdminModule {}
