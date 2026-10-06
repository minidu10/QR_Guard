import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator';

export class NearbyQueryDto {
  @ApiProperty({ example: 6.901 })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 79.8524 })
  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @ApiPropertyOptional({
    default: 300,
    minimum: 10,
    maximum: 5000,
    description: 'Search radius in metres',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(5000)
  radius: number = 300;
}
