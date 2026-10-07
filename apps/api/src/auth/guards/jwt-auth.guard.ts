import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Env } from '../../config/env.validation';
import type { AuthUser, JwtPayload } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Runs on every route. Needs a valid access token unless the route is @Public().
// Public routes still get req.user when a valid token is sent (e.g. a logged-in customer scanning).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    const hasToken = type === 'Bearer' && Boolean(token);

    if (isPublic) {
      if (hasToken) req.user = (await this.verify(token)) ?? undefined;
      return true;
    }
    if (!hasToken) throw new UnauthorizedException('Missing access token');
    const user = await this.verify(token);
    if (!user) throw new UnauthorizedException('Invalid or expired access token');
    req.user = user;
    return true;
  }

  private async verify(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload & { typ?: string }>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      // Special tokens (e.g. live connection tickets) are not access tokens.
      if (payload.typ) return null;
      return { id: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }
}
