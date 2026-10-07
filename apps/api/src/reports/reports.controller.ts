import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateReportDto, ListReportsQueryDto, ReportDto, UpdateReportDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Anyone can report a suspicious QR code. No account needed.
  @Post()
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({ type: ReportDto })
  @ApiTooManyRequestsResponse({ description: 'Too many reports. Wait a minute.' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user?: AuthUser) {
    return this.reports.create(dto, user);
  }

  @Get()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: [ReportDto], description: 'Newest first.' })
  @ApiForbiddenResponse({ description: 'Admins only.' })
  list(@Query() query: ListReportsQueryDto) {
    return this.reports.list(query);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ReportDto })
  @ApiForbiddenResponse({ description: 'Admins only.' })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReportDto) {
    return this.reports.setStatus(id, dto.status);
  }
}
