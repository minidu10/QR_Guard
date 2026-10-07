import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ScanDto, ScanResponseDto } from './dto/scan.dto';
import { ScanService } from './scan.service';

@ApiTags('scan')
@Controller('scan')
export class ScanController {
  constructor(private readonly scans: ScanService) {}

  // Customers do not need an account to check a QR code.
  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ type: ScanResponseDto, description: 'Safe to pay, or a warning.' })
  @ApiTooManyRequestsResponse({ description: 'Too many scans. Wait a minute.' })
  scan(@Body() dto: ScanDto, @CurrentUser() user?: AuthUser) {
    return this.scans.scan(dto, user);
  }
}
