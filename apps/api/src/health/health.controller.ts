import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@qrguard/types';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { HealthResponseDto } from './health.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'All services are up.', type: HealthResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'One or more services are down.',
    type: HealthResponseDto,
  })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const result = await this.health.check();
    // 503 lets Docker and load balancers see that something is wrong.
    if (result.status !== 'ok') res.status(503);
    return result;
  }
}
