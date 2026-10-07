import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse } from '@qrguard/types';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Env } from '../config/env.validation';
import type { User } from '../generated/prisma/client';
import { toPublicUser, UsersService } from '../users/users.service';
import type { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

// Refresh tokens are long and random, so a fast SHA-256 hash is enough to store them.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sameHash(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    // Same message for "no user" and "wrong password", so emails cannot be guessed.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Wrong email or password');
    }
    return this.issueTokens(user);
  }

  // Swaps a valid refresh token for a new pair. The old refresh token stops working.
  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findById(payload.sub);
    const matches =
      user?.refreshTokenHash && sameHash(hashToken(refreshToken), user.refreshTokenHash);
    if (!user || !matches) {
      // Token was already used or revoked. Log the user out everywhere to be safe.
      if (user) await this.users.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Refresh token is no longer valid');
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true }),
        // Random id so two tokens made in the same second are still different.
        jwtid: randomUUID(),
      }),
    ]);
    await this.users.setRefreshTokenHash(user.id, hashToken(refreshToken));
    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
