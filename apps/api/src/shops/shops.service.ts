import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { NearbyShop } from '@qrguard/types';
import type { AuthUser } from '../auth/auth.types';
import type { Shop } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';

const NEARBY_LIMIT = 20;

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateShopDto, user: AuthUser): Promise<Shop> {
    // Owners always create shops for themselves. Admins may pick the owner.
    const ownerId = user.role === 'admin' && dto.ownerId ? dto.ownerId : user.id;
    return this.prisma.shop.create({
      data: { name: dto.name, address: dto.address, lat: dto.lat, lng: dto.lng, ownerId },
    });
  }

  /** Owners: their own shops. Admins: every shop. */
  listManaged(user: AuthUser): Promise<Shop[]> {
    return this.prisma.shop.findMany({
      where: user.role === 'admin' ? {} : { ownerId: user.id },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Shop> {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  // Shops within `radius` metres, closest first. Uses the PostGIS "location" column.
  findNearby({ lat, lng, radius }: NearbyQueryDto): Promise<NearbyShop[]> {
    return this.prisma.$queryRaw<NearbyShop[]>`
      SELECT id, name, owner_id AS "ownerId", address, lat, lng, verified,
             risk_score AS "riskScore", created_at AS "createdAt",
             ROUND(ST_Distance(location, point.geo))::int AS "distanceMeters"
      FROM shops,
           (SELECT ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography AS geo) AS point
      WHERE ST_DWithin(location, point.geo, ${radius})
      ORDER BY location <-> point.geo
      LIMIT ${NEARBY_LIMIT}`;
  }

  // Only the shop's owner or an admin may change a shop or its QR codes.
  assertCanManage(shop: Pick<Shop, 'ownerId'>, user: AuthUser) {
    if (user.role === 'admin') return;
    if (user.role === 'owner' && shop.ownerId === user.id) return;
    throw new ForbiddenException('You can only manage your own shops');
  }
}
