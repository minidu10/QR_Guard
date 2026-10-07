import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
  PaymentDto,
  PaymentSummaryDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // Fake payment for the demo (e.g. after a safe scan). No real money moves.
  @Post('payments')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiCreatedResponse({ type: PaymentDto })
  @ApiNotFoundResponse({ description: 'Merchant id is unknown or revoked.' })
  @ApiTooManyRequestsResponse({ description: 'Too many payments. Wait a minute.' })
  pay(@Body() dto: CreatePaymentDto) {
    return this.payments.pay(dto.merchantId, dto.amount);
  }

  @Get('shops/:id/payments')
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: [PaymentDto], description: 'Latest payments, newest first.' })
  @ApiForbiddenResponse({ description: 'Only the shop owner or an admin can see this.' })
  list(
    @Param('id', ParseUUIDPipe) shopId: string,
    @Query() query: ListPaymentsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payments.listForShop(shopId, user, query.limit);
  }

  @Get('shops/:id/payments/summary')
  @Roles('owner', 'admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: PaymentSummaryDto, description: 'Today vs a normal day, per hour.' })
  @ApiForbiddenResponse({ description: 'Only the shop owner or an admin can see this.' })
  summary(@Param('id', ParseUUIDPipe) shopId: string, @CurrentUser() user: AuthUser) {
    return this.payments.summary(shopId, user);
  }
}
