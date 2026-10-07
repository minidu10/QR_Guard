import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Payment, PaymentStatus, PaymentSummary } from '@qrguard/types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 'QRG482019376', description: 'Merchant id from the scanned QR.' })
  @IsString()
  @Matches(/^[A-Za-z0-9.-]{1,32}$/, { message: 'merchantId is not valid' })
  merchantId: string;

  @ApiProperty({ example: 1500, minimum: 10, maximum: 100000, description: 'Whole rupees (LKR).' })
  @IsInt()
  @Min(10)
  @Max(100000)
  amount: number;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class PaymentDto implements Payment {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty() merchantId: string;
  @ApiProperty({ description: 'Whole rupees (LKR).' }) amount: number;
  @ApiProperty({ example: 'CUST-0042' }) customerRef: string;
  @ApiProperty({ enum: ['success', 'failed'] }) status: PaymentStatus;
  @ApiProperty() createdAt: string;
}

class TodayDto {
  @ApiProperty() count: number;
  @ApiProperty({ description: 'Whole rupees (LKR).' }) total: number;
}

class HourDto {
  @ApiProperty({ minimum: 0, maximum: 23, description: 'Sri Lanka hour.' }) hour: number;
  @ApiProperty() count: number;
  @ApiProperty({ description: 'Average count for this hour over the last 7 days.' })
  typical: number;
}

export class PaymentSummaryDto implements PaymentSummary {
  @ApiProperty({ type: TodayDto }) today: TodayDto;
  @ApiProperty({ type: [HourDto] }) hourly: HourDto[];
}
