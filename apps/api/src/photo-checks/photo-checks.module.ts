import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ShopsModule } from '../shops/shops.module';
import { PhotoChecksController } from './photo-checks.controller';
import { PhotoChecksService } from './photo-checks.service';

@Module({
  imports: [ShopsModule, AlertsModule, AiModule],
  controllers: [PhotoChecksController],
  providers: [PhotoChecksService],
})
export class PhotoChecksModule {}
