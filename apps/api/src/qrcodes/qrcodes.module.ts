import { Module } from '@nestjs/common';
import { ShopsModule } from '../shops/shops.module';
import { QrCodesController } from './qrcodes.controller';
import { QrCodesService } from './qrcodes.service';

@Module({
  imports: [ShopsModule],
  controllers: [QrCodesController],
  providers: [QrCodesService],
  exports: [QrCodesService],
})
export class QrCodesModule {}
