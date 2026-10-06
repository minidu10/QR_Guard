import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CreateQrCodeDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Rotate: revoke all active QR codes of this shop before making the new one.',
  })
  @IsOptional()
  @IsBoolean()
  rotate?: boolean;
}
