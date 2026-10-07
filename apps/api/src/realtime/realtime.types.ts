import type { JwtPayload } from '../auth/auth.types';

/** A short-lived token that only opens the live connection. */
export interface TicketPayload extends JwtPayload {
  typ: 'realtime';
}

export const TICKET_TTL_SECONDS = 60;
