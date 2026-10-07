import { Body, Controller, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateQrCodeDto } from './dto/create-qrcode.dto';
import { GeneratedQrCodeDto, QrCodeDto } from './dto/qrcode-response.dto';
import { QrCodesService } from './qrcodes.service';

@ApiTags('qrcodes')
@ApiBearerAuth()
@Roles('owner', 'admin')
@ApiForbiddenResponse({ description: 'Only the shop owner or an admin can do this.' })
@Controller()
export class QrCodesController {
  constructor(private readonly qrcodes: QrCodesService) {}

  @Post('shops/:id/qrcodes')
  @ApiCreatedResponse({ type: GeneratedQrCodeDto, description: 'New QR code with its image.' })
  @ApiNotFoundResponse({ description: 'Shop not found.' })
  generate(
    @Param('id', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateQrCodeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.qrcodes.generate(shopId, user, dto.rotate);
  }

  @Patch('qrcodes/:id/revoke')
  @ApiOkResponse({ type: QrCodeDto, description: 'The QR code, now revoked.' })
  @ApiNotFoundResponse({ description: 'QR code not found.' })
  revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.qrcodes.revoke(id, user);
  }
}
