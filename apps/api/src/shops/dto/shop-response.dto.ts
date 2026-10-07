import { ApiProperty } from '@nestjs/swagger';
import type { NearbyShop, Shop } from '@qrguard/types';

export class ShopDto implements Shop {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ format: 'uuid' }) ownerId: string;
  @ApiProperty() address: string;
  @ApiProperty({ example: 6.901 }) lat: number;
  @ApiProperty({ example: 79.8524 }) lng: number;
  @ApiProperty() verified: boolean;
  @ApiProperty({ minimum: 0, maximum: 100 }) riskScore: number;
  @ApiProperty() createdAt: string;
}

export class NearbyShopDto extends ShopDto implements NearbyShop {
  @ApiProperty() distanceMeters: number;
}
