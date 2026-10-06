import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { cleanJson } from '../../common/to-json';
import { User } from '../../users/schemas/user.schema';

// GeoJSON point. Coordinates are [longitude, latitude].
@Schema({ _id: false })
export class Point {
  @Prop({ required: true, enum: ['Point'], default: 'Point' })
  type: 'Point';

  @Prop({ required: true, type: [Number] })
  coordinates: [number, number];
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Shop {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, type: Point })
  location: Point;

  // Set by the bank / admin team after checking the shop.
  @Prop({ default: false })
  verified: boolean;

  // 0 (safe) to 100 (high risk). Calculated by the risk module (Phase 7).
  @Prop({ default: 0, min: 0, max: 100 })
  riskScore: number;

  createdAt: Date;
}

export type ShopDocument = HydratedDocument<Shop>;
export const ShopSchema = SchemaFactory.createForClass(Shop);
ShopSchema.index({ location: '2dsphere' });
cleanJson(ShopSchema);
