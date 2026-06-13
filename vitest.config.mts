import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

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
});





