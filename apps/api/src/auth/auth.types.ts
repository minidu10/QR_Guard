import type { Role } from '@qrguard/types';

/** Data stored inside a JWT. `sub` is the user id. */
export interface JwtPayload {
  sub: string;
  role: Role;
}

/** The logged-in user attached to each request. */
export interface AuthUser {
  id: string;
  role: Role;
}
