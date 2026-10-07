import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { AlertWithShop, Payment, RealtimeEvents } from '@qrguard/types';
import type { Server, Socket } from 'socket.io';
import type { AuthUser } from '../auth/auth.types';
import { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import type { TicketPayload } from './realtime.types';

export const shopRoom = (shopId: string) => `shop:${shopId}`;
export const ADMIN_ROOM = 'admin';

// Live updates for shop owners and admins (Socket.io).
// Owners join one room per shop they own. Admins join the "admin" room.
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  // Not set when the app runs without a server (e.g. the seed script).
  @WebSocketServer() private readonly server?: Server<Record<string, never>, RealtimeEvents>;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const user = await this.verifyTicket(client.handshake.auth?.ticket);
    if (!user) {
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    if (user.role === 'admin') {
      await client.join(ADMIN_ROOM);
    } else if (user.role === 'owner') {
      const shops = await this.prisma.shop.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      await client.join(shops.map((s) => shopRoom(s.id)));
    } else {
      client.disconnect(true);
    }
  }

  /** New alert: tell the shop owner and the bank team. */
  emitAlert(alert: AlertWithShop) {
    this.server?.to([shopRoom(alert.shopId), ADMIN_ROOM]).emit('alert', alert);
  }

  /** New payment: update the shop's live dashboard. */
  emitPayment(payment: Payment) {
    this.server?.to(shopRoom(payment.shopId)).emit('payment', payment);
  }

  private async verifyTicket(ticket: unknown): Promise<AuthUser | null> {
    if (typeof ticket !== 'string') return null;
    try {
      const payload = await this.jwt.verifyAsync<TicketPayload>(ticket, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      if (payload.typ !== 'realtime') return null;
      return { id: payload.sub, role: payload.role };
    } catch (err) {
      this.logger.debug(`Rejected live connection: ${(err as Error).message}`);
      return null;
    }
  }
}
