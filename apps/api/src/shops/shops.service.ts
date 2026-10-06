import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { NearbyShop } from '@qrguard/types';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../auth/auth.types';
import { CreateShopDto } from './dto/create-shop.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { Shop, ShopDocument } from './schemas/shop.schema';

const NEARBY_LIMIT = 20;

@Injectable()
export class ShopsService {
  constructor(@InjectModel(Shop.name) private readonly shops: Model<Shop>) {}

  create(dto: CreateShopDto, user: AuthUser): Promise<ShopDocument> {
    // Owners always create shops for themselves. Admins may pick the owner.
    const ownerId = user.role === 'admin' && dto.ownerId ? dto.ownerId : user.id;
    return this.shops.create({
      name: dto.name,
      address: dto.address,
      ownerId: new Types.ObjectId(ownerId),
      location: { type: 'Point', coordinates: [dto.lng, dto.lat] },
    });
  }

  async findById(id: Types.ObjectId | string): Promise<ShopDocument> {
    const shop = await this.shops.findById(id).exec();
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  // Shops within `radius` metres, closest first.
  async findNearby({ lat, lng, radius }: NearbyQueryDto): Promise<NearbyShop[]> {
    const rows = await this.shops.aggregate<Shop & { _id: Types.ObjectId; distanceMeters: number }>(
      [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters',
            maxDistance: radius,
            spherical: true,
          },
        },
        { $limit: NEARBY_LIMIT },
      ],
    );
    // Aggregation returns plain objects, so turn them into the same JSON as findById.
    return rows.map((row) => ({
      ...(this.shops.hydrate(row).toJSON() as unknown as NearbyShop),
      distanceMeters: Math.round(row.distanceMeters),
    }));
  }

  // Only the shop's owner or an admin may change a shop or its QR codes.
  assertCanManage(shop: ShopDocument, user: AuthUser) {
    if (user.role === 'admin') return;
    if (user.role === 'owner' && shop.ownerId.equals(user.id)) return;
    throw new ForbiddenException('You can only manage your own shops');
  }
}
