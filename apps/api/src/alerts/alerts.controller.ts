import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AlertsService } from './alerts.service';
import { AlertDto, AlertWithShopDto, ListAlertsQueryDto } from './dto/alert.dto';

@ApiTags('alerts')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Only the shop owner or an admin can do this.' })
@Controller()
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get('shops/:id/alerts')
  @Roles('owner', 'admin')
  @ApiOkResponse({ type: [AlertDto], description: 'Alerts for one shop, newest first.' })
  @ApiNotFoundResponse({ description: 'Shop not found.' })
  listForShop(
    @Param('id', ParseUUIDPipe) shopId: string,
    @Query() query: ListAlertsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.alerts.listForShop(shopId, user, query);
  }

  @Get('alerts')
  @Roles('admin')
  @ApiOkResponse({ type: [AlertWithShopDto], description: 'Alerts for all shops, newest first.' })
  listAll(@Query() query: ListAlertsQueryDto) {
    return this.alerts.listAll(query);
  }

  @Patch('alerts/:id/read')
  @Roles('owner', 'admin')
  @ApiOkResponse({ type: AlertDto, description: 'The alert, now marked as read.' })
  @ApiNotFoundResponse({ description: 'Alert not found.' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.alerts.markRead(id, user);
  }
}
