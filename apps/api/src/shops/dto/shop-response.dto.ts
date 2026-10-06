import { ApiProperty } from '@nestjs/swagger';
import type { GeoPoint, NearbyShop, Shop } from '@qrguard/types';

export class GeoPointDto implements GeoPoint {
  @ApiProperty({ enum: ['Point'] }) type: 'Point';
  @ApiProperty({ example: [79.8524, 6.901], description: '[longitude, latitude]' })
  coordinates: [number, number];
}

export class ShopDto implements Shop {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() address: string;
  @ApiProperty({ type: GeoPointDto }) location: GeoPointDto;
  @ApiProperty() verified: boolean;
  @ApiProperty({ minimum: 0, maximum: 100 }) riskScore: number;
  @ApiProperty() createdAt: string;
}

export class NearbyShopDto extends ShopDto implements NearbyShop {
  @ApiProperty() distanceMeters: number;
}
