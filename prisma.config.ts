import { defineConfig } from '@prisma/config';
// Prisma v6+ stops auto-loading .env once a prisma.config.ts exists, which
// makes the CLI miss DATABASE_URL / DIRECT_URL and fail with P1012. Loading
// dotenv here ourselves restores the old "just works" behaviour locally.
// In CI / Vercel the vars are already in process.env, so this is a no-op.
import 'dotenv/config';

export default defineConfig({
  migrations: {
    seed: 'node prisma/seed.mjs',
  },
});
