import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config dành riêng cho benchmark (bench() API).
 * Dùng cùng CF pool với integration tests để đo hiệu năng
 * trong môi trường gần production nhất.
 *
 * Run: npm run bench
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  resolve: {
    alias: {
      '@paralleldrive/cuid2': resolve(__dirname, './src/test/__mocks__/cuid2.mock.ts'),
    },
  },
  test: {
    include: ['src/**/*.bench.ts'],
    benchmark: {
      include: ['src/**/*.bench.ts'],
      reporters: ['verbose'],
    },
  },
});
