import { ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ShopsService } from './shops.service';

describe('ShopsService.assertCanManage', () => {
  const service = new ShopsService({} as PrismaService);
  const ownerId = randomUUID();
  const shop = { ownerId };

  it('lets the owner and admins manage the shop', () => {
    expect(() => service.assertCanManage(shop, { id: ownerId, role: 'owner' })).not.toThrow();
    expect(() => service.assertCanManage(shop, { id: 'any', role: 'admin' })).not.toThrow();
  });

  it('blocks other owners and customers', () => {
    const other = randomUUID();
    expect(() => service.assertCanManage(shop, { id: other, role: 'owner' })).toThrow(
      ForbiddenException,
    );
    expect(() => service.assertCanManage(shop, { id: ownerId, role: 'customer' })).toThrow(
      ForbiddenException,
    );
  });
});
