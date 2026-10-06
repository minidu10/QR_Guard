import { ForbiddenException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from './schemas/shop.schema';
import { ShopsService } from './shops.service';

describe('ShopsService.assertCanManage', () => {
  const service = new ShopsService({} as Model<Shop>);
  const ownerId = new Types.ObjectId();
  const shop = { ownerId } as ShopDocument;

  it('lets the owner and admins manage the shop', () => {
    expect(() =>
      service.assertCanManage(shop, { id: ownerId.toString(), role: 'owner' }),
    ).not.toThrow();
    expect(() => service.assertCanManage(shop, { id: 'any', role: 'admin' })).not.toThrow();
  });

  it('blocks other owners and customers', () => {
    const other = new Types.ObjectId().toString();
    expect(() => service.assertCanManage(shop, { id: other, role: 'owner' })).toThrow(
      ForbiddenException,
    );
    expect(() =>
      service.assertCanManage(shop, { id: ownerId.toString(), role: 'customer' }),
    ).toThrow(ForbiddenException);
  });
});
