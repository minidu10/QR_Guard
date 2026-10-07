import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentDropService } from './payment-drop.service';
import { PaymentSimulator } from './payment-simulator.service';

@Module({
  imports: [AlertsModule, PaymentsModule],
  providers: [PaymentDropService, PaymentSimulator],
  exports: [PaymentDropService, PaymentSimulator],
})
export class PaymentDropModule {}
