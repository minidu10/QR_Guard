import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Role } from '@qrguard/types';
import { HydratedDocument } from 'mongoose';
import { cleanJson } from '../../common/to-json';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ['customer', 'owner', 'admin'], default: 'customer' })
  role: Role;

  // Hash of the latest refresh token. Cleared or replaced on every refresh.
  @Prop()
  refreshTokenHash?: string;

  createdAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
cleanJson(UserSchema, ['passwordHash', 'refreshTokenHash']);
