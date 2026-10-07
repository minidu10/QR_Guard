import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { ShopsModule } from '../shops/shops.module';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({
  imports: [ShopsModule, AlertsModule],
  controllers: [ScanController],
  providers: [ScanService],
})
export class ScanModule {}
