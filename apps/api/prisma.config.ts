// Prisma CLI settings (migrations, generate).
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Not needed for `prisma generate`, so an empty value is fine there.
    url: process.env.DATABASE_URL ?? '',
    // Supabase: direct connection for migrations (falls back to DATABASE_URL).
    directUrl: process.env.DIRECT_URL || undefined,
  },
});
