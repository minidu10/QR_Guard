import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Env } from '../config/env.validation';
import { TICKET_TTL_SECONDS, type TicketPayload } from './realtime.types';

class TicketDto {
  @ApiProperty({
    description: `Send as auth.ticket when connecting. Valid ${TICKET_TTL_SECONDS}s.`,
  })
  ticket: string;
}

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // The web app keeps tokens in httpOnly cookies, so the browser cannot read them.
  // Instead it asks (through the web server) for this short ticket to open the live connection.
  @Post('ticket')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin')
  @ApiOkResponse({ type: TicketDto })
  async ticket(@CurrentUser() user: AuthUser): Promise<TicketDto> {
    const payload: TicketPayload = { sub: user.id, role: user.role, typ: 'realtime' };
    const ticket = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: TICKET_TTL_SECONDS,
    });
    return { ticket };
  }
}
