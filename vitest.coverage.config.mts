import { resolve } from 'path';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Vite plugin to mock cloudflare:* virtual modules in Node environment.
 *
 * resolve.alias cannot reliably intercept URL-scheme module specifiers
 * (e.g. cloudflare:test) because Vite's resolver may short-circuit before
 * alias matching for non-standard schemes.
 *
 * Using a plugin's resolveId hook with enforce: 'pre' guarantees interception
 * before any other resolution mechanism.
 */
function cloudflareModulesMock(): Plugin {
  const mocks: Record<string, string> = {
    'cloudflare:test': resolve(__dirname, './src/test/__mocks__/cloudflare-test.node.ts'),
  };

  return {
    name: 'cloudflare-modules-mock',
    enforce: 'pre',
    resolveId(id) {
      if (id in mocks) return mocks[id];
    },
  };
}

export default defineConfig({
  plugins: [cloudflareModulesMock()],
  resolve: {
    alias: {
      '@paralleldrive/cuid2': resolve(__dirname, './src/test/__mocks__/cuid2.mock.ts'),
    },
  },
  test: {
    // forks pool: each test file gets its own process + isolated SQLite DB.
    // Also required for v8 coverage to flush __coverage__ back to main process.
    pool: 'forks',
    environment: 'node',
    // Patch crypto.subtle to add MD5 support (missing in Node, present in CF Workers)
    setupFiles: ['./src/test/setup.node.ts'],
    // Include all test files — integration tests now work via SQLite shim
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/__mocks__/**', 'src/**/__benches__/**', 'src/test/**', 'src/**/*.d.ts'],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
    },
  },
});


