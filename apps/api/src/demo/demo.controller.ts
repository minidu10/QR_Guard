import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DemoService } from './demo.service';

class AddPaymentsDto {
  @ApiProperty({ minimum: 1, maximum: 50, example: 5 })
  @IsInt()
  @Min(1)
  @Max(50)
  count: number;
}

@ApiTags('demo')
@ApiBearerAuth()
@Roles('admin')
@ApiForbiddenResponse({ description: 'Admins only.' })
@Controller('demo/shops/:id')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Post('payment-drop')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Removes the last hour of payments and runs the drop check.' })
  paymentDrop(@Param('id', ParseUUIDPipe) shopId: string) {
    return this.demo.simulatePaymentDrop(shopId);
  }

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Fake payments made now.' })
  addPayments(@Param('id', ParseUUIDPipe) shopId: string, @Body() dto: AddPaymentsDto) {
    return this.demo.addPayments(shopId, dto.count);
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Normal fake payments start again.' })
  resume(@Param('id', ParseUUIDPipe) shopId: string) {
    return this.demo.resume(shopId);
  }
}
