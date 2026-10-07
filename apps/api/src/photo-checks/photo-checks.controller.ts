import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import type { PhotoCheck, PhotoResult } from '@qrguard/types';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListPaymentsQueryDto } from '../payments/dto/payment.dto';
import { MAX_PHOTO_BYTES, PhotoChecksService, type UploadedPhoto } from './photo-checks.service';

class PhotoCheckDto implements PhotoCheck {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ enum: ['real', 'tampered'] }) result: PhotoResult;
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence: number;
  @ApiProperty({ enum: ['mock', 'real'], description: 'mock = fixed answers before training' })
  modelMode: 'mock' | 'real';
  @ApiProperty() createdAt: string;
}

@ApiTags('photo-checks')
@ApiBearerAuth()
@Roles('owner', 'admin')
@ApiForbiddenResponse({ description: 'Only the shop owner or an admin can do this.' })
@Controller()
export class PhotoChecksController {
  constructor(private readonly checks: PhotoChecksService) {}

  @Post('shops/:id/photo-checks')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: { photo: { type: 'string', format: 'binary', description: 'Max 5 MB' } },
    },
  })
  @ApiCreatedResponse({
    type: PhotoCheckDto,
    description: 'AI result. Tampered also makes an alert.',
  })
  @ApiPayloadTooLargeResponse({ description: 'Photo is bigger than 5 MB.' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a JPEG, PNG or WebP photo.' })
  @ApiServiceUnavailableResponse({ description: 'The AI service is down.' })
  upload(
    @Param('id', ParseUUIDPipe) shopId: string,
    @UploadedFile() file: UploadedPhoto | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.checks.check(shopId, user, file);
  }

  @Get('shops/:id/photo-checks')
  @ApiOkResponse({ type: [PhotoCheckDto], description: 'Newest first.' })
  list(
    @Param('id', ParseUUIDPipe) shopId: string,
    @Query() query: ListPaymentsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.checks.listForShop(shopId, user, query.limit);
  }

  @Get('photo-checks/:id/image')
  @ApiOkResponse({ description: 'The uploaded photo.' })
  async image(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const { body, contentType } = await this.checks.image(id, user);
    return new StreamableFile(body, { type: contentType });
  }
}
