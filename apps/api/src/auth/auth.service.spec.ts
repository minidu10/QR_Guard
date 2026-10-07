import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// A tiny in-memory "database" that behaves like UsersService.
function fakeUsers() {
  const rows = new Map<string, Record<string, unknown>>();
  const asDoc = (row: Record<string, unknown>) => ({ ...row });
  return {
    rows,
    create: jest.fn(async (data: Record<string, unknown>) => {
      const id = randomUUID();
      rows.set(id, { ...data, id, createdAt: new Date(), refreshTokenHash: null });
      return asDoc(rows.get(id)!);
    }),
    findByEmail: jest.fn(async (email: string) => {
      const row = [...rows.values()].find((r) => r.email === email);
      return row ? asDoc(row) : null;
    }),
    findById: jest.fn(async (id: string) => (rows.has(id) ? asDoc(rows.get(id)!) : null)),
    setRefreshTokenHash: jest.fn(async (id: string, hash: string | null) => {
      const row = rows.get(id)!;
      row.refreshTokenHash = hash;
    }),
  };
}

const env: Record<string, unknown> = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_ACCESS_TTL_SECONDS: 900,
  JWT_REFRESH_TTL_SECONDS: 3600,
};

function setup() {
  const users = fakeUsers();
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const jwt = new JwtService({});
  const service = new AuthService(users as unknown as UsersService, jwt, config as never);
  return { service, users, jwt };
}

const newUser = {
  name: 'Nimal',
  email: 'nimal@example.com',
  password: 'secret-password',
  role: 'owner' as const,
};

describe('AuthService', () => {
  it('registers a user, hashes the password and returns tokens', async () => {
    const { service, users, jwt } = setup();
    const res = await service.register(newUser);

    const stored = [...users.rows.values()][0];
    expect(stored.passwordHash).not.toBe(newUser.password);
    expect(res.user).not.toHaveProperty('passwordHash');
    expect(res.user).not.toHaveProperty('refreshTokenHash');
    const payload = await jwt.verifyAsync(res.accessToken, {
      secret: env.JWT_ACCESS_SECRET as string,
    });
    expect(payload).toMatchObject({ sub: res.user.id, role: 'owner' });
  });

  it('does not allow the same email twice', async () => {
    const { service } = setup();
    await service.register(newUser);
    await expect(service.register(newUser)).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with the right password only', async () => {
    const { service } = setup();
    await service.register(newUser);
    await expect(
      service.login({ email: newUser.email, password: newUser.password }),
    ).resolves.toHaveProperty('accessToken');
    await expect(
      service.login({ email: newUser.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: 'nobody@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates refresh tokens: the old one stops working', async () => {
    const { service } = setup();
    const first = await service.register(newUser);
    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // Re-using the old token fails, and also logs the user out (new token stops working too).
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not accept an access token as a refresh token', async () => {
    const { service } = setup();
    const res = await service.register(newUser);
    await expect(service.refresh(res.accessToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
