import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Alert, AlertType, AlertWithShop, Severity } from '@qrguard/types';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const ALERT_TYPES: AlertType[] = [
  'SCAN_MISMATCH',
  'TAMPER_DETECTED',
  'PAYMENT_DROP',
  'CUSTOMER_REPORT',
];

export class AlertDto implements Alert {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ enum: ALERT_TYPES }) type: AlertType;
  @ApiProperty({ enum: ['low', 'medium', 'high'] }) severity: Severity;
  @ApiProperty() message: string;
  @ApiProperty({ type: Object, nullable: true }) data: Record<string, unknown> | null;
  @ApiProperty() read: boolean;
  @ApiProperty() createdAt: string;
}

export class AlertWithShopDto extends AlertDto implements AlertWithShop {
  @ApiProperty() shopName: string;
}

export class ListAlertsQueryDto {
  @ApiPropertyOptional({ description: 'Only unread alerts.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unread?: boolean;

  @ApiPropertyOptional({ enum: ALERT_TYPES, description: 'Admin list only.' })
  @IsOptional()
  @IsIn(ALERT_TYPES)
  type?: AlertType;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}
