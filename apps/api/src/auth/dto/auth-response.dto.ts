import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AuthResponse, PublicUser, Role } from '@qrguard/types';

export class PublicUserDto implements PublicUser {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone?: string;
  @ApiProperty({ enum: ['customer', 'owner', 'admin'] }) role: Role;
  @ApiProperty() createdAt: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: PublicUserDto }) user: PublicUserDto;
}
