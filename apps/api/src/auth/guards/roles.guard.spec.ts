import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@qrguard/types';
import { RolesGuard } from './roles.guard';

function context(role?: Role): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { id: '1', role } : undefined }) }),
  } as unknown as ExecutionContext;
}

function guardWith(roles?: Role[]) {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows any logged-in user when the route has no @Roles', () => {
    expect(guardWith(undefined).canActivate(context('customer'))).toBe(true);
  });

  it('allows a user with a listed role', () => {
    expect(guardWith(['owner', 'admin']).canActivate(context('owner'))).toBe(true);
  });

  it('blocks a user without a listed role', () => {
    expect(() => guardWith(['admin']).canActivate(context('owner'))).toThrow(ForbiddenException);
    expect(() => guardWith(['admin']).canActivate(context())).toThrow(ForbiddenException);
  });
});
