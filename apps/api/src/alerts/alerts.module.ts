import { Module } from '@nestjs/common';
import { RiskModule } from '../risk/risk.module';
import { ShopsModule } from '../shops/shops.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [ShopsModule, RiskModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
