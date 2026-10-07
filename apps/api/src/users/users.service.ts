import { Injectable } from '@nestjs/common';
import type { PublicUser } from '@qrguard/types';
import type { Role, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** User data that is safe to send to the browser (no password or token hashes). */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; email: string; phone?: string; passwordHash: string; role: Role }) {
    return this.prisma.user.create({ data: { ...data, email: data.email.toLowerCase() } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async setRefreshTokenHash(id: string, hash: string | null) {
    await this.prisma.user.update({ where: { id }, data: { refreshTokenHash: hash } });
  }
}
