import type { Config } from 'drizzle-kit';

export default {
  driver: 'd1-http',
  dialect: 'sqlite',
  schema: './src/models/index.ts',
  out: './migrations',
} satisfies Config;
