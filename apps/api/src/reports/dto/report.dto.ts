import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Report, ReportStatus } from '@qrguard/types';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const REPORT_STATUSES: ReportStatus[] = ['open', 'reviewing', 'resolved', 'dismissed'];

export class CreateReportDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'The scan this report is about.' })
  @IsOptional()
  @IsUUID()
  scanId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'The shop, if not linked to a scan.' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiProperty({ example: 'The QR sticker looks new and is stuck over the old one.' })
  @IsString()
  @Length(5, 500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description: string;
}

export class UpdateReportDto {
  @ApiProperty({ enum: REPORT_STATUSES })
  @IsIn(REPORT_STATUSES)
  status: ReportStatus;
}

export class ListReportsQueryDto {
  @ApiPropertyOptional({ enum: REPORT_STATUSES })
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatus;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}

export class ReportDto implements Report {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: String, nullable: true }) shopId: string | null;
  @ApiProperty({ type: String, nullable: true }) shopName: string | null;
  @ApiProperty({ type: String, nullable: true }) scanId: string | null;
  @ApiProperty({ type: String, nullable: true }) merchantId: string | null;
  @ApiProperty() description: string;
  @ApiProperty({ enum: REPORT_STATUSES }) status: ReportStatus;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
