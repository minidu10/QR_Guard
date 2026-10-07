import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ScanReason, ScanResponse, ShopSummary } from '@qrguard/types';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';

export class ScanDto {
  @ApiProperty({ description: 'The text inside the scanned QR code.' })
  @IsString()
  @Length(1, 512)
  qrPayload: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'The shop the customer says they are at.' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  // Customer location. Send both or neither.
  @ApiPropertyOptional({ example: 6.901 })
  @ValidateIf((o: ScanDto) => o.lat !== undefined || o.lng !== undefined)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 79.8524 })
  @ValidateIf((o: ScanDto) => o.lat !== undefined || o.lng !== undefined)
  @IsLongitude()
  lng?: number;
}

export class ShopSummaryDto implements ShopSummary {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() address: string;
  @ApiProperty() verified: boolean;
}

export class ScanResponseDto implements ScanResponse {
  @ApiProperty({ format: 'uuid' }) scanId: string;
  @ApiProperty() safe: boolean;
  @ApiProperty({
    enum: ['OK', 'NOT_PAYMENT_QR', 'BAD_CHECKSUM', 'UNKNOWN_MERCHANT', 'REVOKED_QR', 'WRONG_SHOP'],
  })
  reason: ScanReason;
  @ApiProperty() message: string;
  @ApiProperty({ type: ShopSummaryDto, nullable: true }) shop: ShopSummaryDto | null;
  @ApiProperty({ type: ShopSummaryDto, nullable: true }) expectedShop: ShopSummaryDto | null;
  @ApiProperty({ type: String, nullable: true }) qrMerchantName: string | null;
}
