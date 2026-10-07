import { Module } from '@nestjs/common';
import { PaymentDropModule } from '../payment-drop/payment-drop.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShopsModule } from '../shops/shops.module';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

@Module({
  imports: [ShopsModule, PaymentsModule, PaymentDropModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
