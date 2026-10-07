import { Prisma } from '../generated/prisma/client';

/** True if the error is "unique value already exists" (Prisma code P2002). */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
