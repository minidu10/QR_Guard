import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';

// Phase 2: only the Payment model (used by the seed script).
// The POST/GET /payments routes come in a later phase.
@Module({
  imports: [MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }])],
  exports: [MongooseModule],
})
export class PaymentsModule {}
