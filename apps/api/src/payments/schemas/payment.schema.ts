import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { cleanJson } from '../../common/to-json';
import { Shop } from '../../shops/schemas/shop.schema';

export type PaymentStatus = 'success' | 'failed';

// A fake payment. QRGuard never touches real money.
@Schema()
export class Payment {
  @Prop({ required: true, type: Types.ObjectId, ref: Shop.name })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  merchantId: string;

  // Amount in LKR.
  @Prop({ required: true, min: 0 })
  amount: number;

  // Fake customer reference, e.g. "CUST-0042".
  @Prop({ required: true })
  customerRef: string;

  @Prop({ required: true, enum: ['success', 'failed'], default: 'success' })
  status: PaymentStatus;

  // Set by hand (not "timestamps") so the seed script can create past payments.
  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ shopId: 1, createdAt: -1 });
cleanJson(PaymentSchema);
