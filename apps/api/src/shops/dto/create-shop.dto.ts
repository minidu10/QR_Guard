import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateShopDto {
  @ApiProperty({ example: 'Perera Grocery' })
  @IsString()
  @Length(2, 80)
  @Transform(trim)
  name: string;

  @ApiProperty({ example: '45 Galle Road, Colombo' })
  @IsString()
  @Length(5, 200)
  @Transform(trim)
  address: string;

  // Shops must be inside Sri Lanka (rough bounding box).
  @ApiProperty({ example: 6.901, description: 'Latitude (Sri Lanka only)' })
  @IsLatitude()
  @Min(5.8)
  @Max(10)
  lat: number;

  @ApiProperty({ example: 79.8524, description: 'Longitude (Sri Lanka only)' })
  @IsLongitude()
  @Min(79.5)
  @Max(82)
  lng: number;

  @ApiPropertyOptional({ description: 'Admin only: create the shop for this owner.' })
  @IsOptional()
  @IsMongoId()
  ownerId?: string;
}
