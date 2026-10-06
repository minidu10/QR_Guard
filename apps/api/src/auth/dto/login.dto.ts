import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner1@qrguard.lk' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'a-strong-password' })
  @IsString()
  @MaxLength(72)
  password: string;
}
