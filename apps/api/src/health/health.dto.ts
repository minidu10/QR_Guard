import { ApiProperty } from '@nestjs/swagger';
import type { HealthResponse, ServiceStatus } from '@qrguard/types';

// Swagger description of the health response.
export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ enum: ['ok', 'error'] })
  status: 'ok' | 'error';

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({
    example: { database: 'up', redis: 'up', storage: 'up', ai: 'up' },
    additionalProperties: { type: 'string', enum: ['up', 'down'] },
  })
  services: Record<string, ServiceStatus>;
}
