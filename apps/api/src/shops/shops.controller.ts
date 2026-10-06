import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateShopDto } from './dto/create-shop.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { NearbyShopDto, ShopDto } from './dto/shop-response.dto';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Post()
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ShopDto })
  @ApiForbiddenResponse({ description: 'Only owners and admins can create shops.' })
  create(@Body() dto: CreateShopDto, @CurrentUser() user: AuthUser) {
    return this.shops.create(dto, user);
  }

  // Declared before ":id" so "nearby" is not read as an id.
  @Get('nearby')
  @Public()
  @ApiOkResponse({
    type: [NearbyShopDto],
    description: 'Shops near a point, closest first (max 20).',
  })
  nearby(@Query() query: NearbyQueryDto) {
    return this.shops.findNearby(query);
  }

  @Get(':id')
  @Public()
  @ApiOkResponse({ type: ShopDto })
  @ApiNotFoundResponse({ description: 'Shop not found.' })
  findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.shops.findById(id);
  }
}
