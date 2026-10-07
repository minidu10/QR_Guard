import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { RiskModule } from '../risk/risk.module';
import { ShopsModule } from '../shops/shops.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ShopsModule, AlertsModule, RiskModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
