import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import type { AdminOverview, Shop } from '@qrguard/types';
import { IsBoolean } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { slDayStart } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { ShopDto } from '../shops/dto/shop-response.dto';
import { ShopsService } from '../shops/shops.service';

class VerifyShopDto {
  @ApiProperty({ description: 'true = checked by the bank team.' })
  @IsBoolean()
  verified: boolean;
}

class AdminOverviewDto implements AdminOverview {
  @ApiProperty() shops: number;
  @ApiProperty() verifiedShops: number;
  @ApiProperty({ description: 'Risk score 60 or more.' }) highRiskShops: number;
  @ApiProperty({ description: 'Since midnight, Sri Lanka time.' }) scansToday: number;
  @ApiProperty() warningsToday: number;
  @ApiProperty() alertsToday: number;
  @ApiProperty({ description: 'Open or being reviewed.' }) openReports: number;
}

// Bank team (admin) tools.
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@ApiForbiddenResponse({ description: 'Admins only.' })
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
    private readonly risk: RiskService,
  ) {}

  @Get('overview')
  @ApiOkResponse({ type: AdminOverviewDto })
  async overview(): Promise<AdminOverview> {
    const today = slDayStart(new Date());
    const [
      shops,
      verifiedShops,
      highRiskShops,
      scansToday,
      warningsToday,
      alertsToday,
      openReports,
    ] = await Promise.all([
      this.prisma.shop.count(),
      this.prisma.shop.count({ where: { verified: true } }),
      this.prisma.shop.count({ where: { riskScore: { gte: 60 } } }),
      this.prisma.scanCheck.count({ where: { createdAt: { gte: today } } }),
      this.prisma.scanCheck.count({ where: { createdAt: { gte: today }, result: 'warning' } }),
      this.prisma.alert.count({ where: { createdAt: { gte: today } } }),
      this.prisma.report.count({ where: { status: { in: ['open', 'reviewing'] } } }),
    ]);
    return {
      shops,
      verifiedShops,
      highRiskShops,
      scansToday,
      warningsToday,
      alertsToday,
      openReports,
    };
  }

  @Patch('shops/:id/verify')
  @ApiOkResponse({ type: ShopDto, description: 'The shop, with its new risk score.' })
  async verify(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VerifyShopDto): Promise<Shop> {
    await this.shops.findById(id);
    await this.prisma.shop.update({ where: { id }, data: { verified: dto.verified } });
    await this.risk.recompute(id);
    const shop = await this.shops.findById(id);
    return { ...shop, createdAt: shop.createdAt.toISOString() };
  }
}
