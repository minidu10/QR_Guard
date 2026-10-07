import type { HealthResponse } from '@qrguard/types';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

// Builds a controller with a fake HealthService.
function setup(result: HealthResponse) {
  const service = { check: jest.fn().mockResolvedValue(result) } as unknown as HealthService;
  const res = { status: jest.fn() } as unknown as Response;
  return { controller: new HealthController(service), res };
}

const services = { database: 'up', redis: 'up', storage: 'up', ai: 'up' } as const;

describe('HealthController', () => {
  it('returns 200 when all services are up', async () => {
    const { controller, res } = setup({ status: 'ok', timestamp: 'now', services });
    const body = await controller.check(res);
    expect(body.status).toBe('ok');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 503 when a service is down', async () => {
    const { controller, res } = setup({
      status: 'error',
      timestamp: 'now',
      services: { ...services, redis: 'down' },
    });
    const body = await controller.check(res);
    expect(body.services.redis).toBe('down');
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
