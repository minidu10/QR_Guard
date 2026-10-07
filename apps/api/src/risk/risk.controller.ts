import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import type { RiskFactor, RiskLevel, ShopRisk } from '@qrguard/types';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ShopsService } from '../shops/shops.service';
import { RiskService } from './risk.service';

class RiskFactorDto implements RiskFactor {
  @ApiProperty({ example: '2 fake QR scans this week' }) label: string;
  @ApiProperty({ example: 25 }) points: number;
}

class ShopRiskDto implements ShopRisk {
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) score: number;
  @ApiProperty({ enum: ['low', 'medium', 'high'] }) level: RiskLevel;
  @ApiProperty({ type: [RiskFactorDto], description: 'Reasons, biggest first.' })
  factors: RiskFactorDto[];
  @ApiProperty() updatedAt: string;
}

@ApiTags('risk')
@ApiBearerAuth()
@Controller('shops/:id/risk')
export class RiskController {
  constructor(
    private readonly risk: RiskService,
    private readonly shops: ShopsService,
  ) {}

  @Get()
  @Roles('owner', 'admin')
  @ApiOkResponse({ type: ShopRiskDto, description: 'Risk score 0-100 with the reasons.' })
  @ApiForbiddenResponse({ description: 'Only the shop owner or an admin can see this.' })
  async get(@Param('id', ParseUUIDPipe) shopId: string, @CurrentUser() user: AuthUser) {
    this.shops.assertCanManage(await this.shops.findById(shopId), user);
    return this.risk.compute(shopId);
  }
}
