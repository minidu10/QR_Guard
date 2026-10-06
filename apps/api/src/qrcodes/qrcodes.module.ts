import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopsModule } from '../shops/shops.module';
import { QrCodesController } from './qrcodes.controller';
import { QrCodesService } from './qrcodes.service';
import { QRCode, QRCodeSchema } from './schemas/qrcode.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: QRCode.name, schema: QRCodeSchema }]), ShopsModule],
  controllers: [QrCodesController],
  providers: [QrCodesService],
  exports: [QrCodesService, MongooseModule],
})
export class QrCodesModule {}
