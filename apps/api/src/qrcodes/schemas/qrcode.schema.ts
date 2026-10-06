import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { QrCodeStatus } from '@qrguard/types';
import { HydratedDocument, Types } from 'mongoose';
import { cleanJson } from '../../common/to-json';
import { Shop } from '../../shops/schemas/shop.schema';

@Schema({ collection: 'qrcodes', timestamps: { createdAt: true, updatedAt: false } })
export class QRCode {
  @Prop({ required: true, type: Types.ObjectId, ref: Shop.name, index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  merchantId: string;

  // The exact text inside the QR image.
  @Prop({ required: true })
  qrPayload: string;

  @Prop({ required: true, enum: ['active', 'revoked'], default: 'active' })
  status: QrCodeStatus;

  @Prop()
  revokedAt?: Date;

  createdAt: Date;
}

export type QRCodeDocument = HydratedDocument<QRCode>;
export const QRCodeSchema = SchemaFactory.createForClass(QRCode);
cleanJson(QRCodeSchema);
