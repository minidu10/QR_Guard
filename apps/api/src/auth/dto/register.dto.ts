import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

// Sri Lankan mobile: +947XXXXXXXX or 07XXXXXXXX.
const SL_PHONE = /^(\+94|0)7\d{8}$/;

export class RegisterDto {
  @ApiProperty({ example: 'Nimal Perera' })
  @IsString()
  @Length(2, 80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ example: 'nimal@example.com' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional()
  @Matches(SL_PHONE, { message: 'phone must be a Sri Lankan mobile number' })
  phone?: string;

  @ApiProperty({ minLength: 8, example: 'a-strong-password' })
  @IsString()
  @Length(8, 72)
  password: string;

  // Admins cannot sign up. They are created by the seed script.
  @ApiProperty({ enum: ['customer', 'owner'], example: 'owner' })
  @IsIn(['customer', 'owner'])
  role: 'customer' | 'owner';
}
