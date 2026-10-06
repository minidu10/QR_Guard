import { SetMetadata } from '@nestjs/common';
import type { Role } from '@qrguard/types';

export const ROLES_KEY = 'roles';

/** Only users with one of these roles can call the route. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
