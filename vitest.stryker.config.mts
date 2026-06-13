import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config cho Stryker mutation testing.
 * Chạy trong Node environment (không phải CF pool) vì Stryker
 * cần kiểm soát module loading để apply mutations.
 *
 * Chỉ test các pure utils không cần CF bindings.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@paralleldrive/cuid2': resolve(__dirname, './src/test/__mocks__/cuid2.mock.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/utils/__tests__/rbac.test.ts',
      'src/utils/__tests__/errorHandler.test.ts',
      'src/utils/__tests__/errors.test.ts',
    ],
    // Stub CF-specific imports với node-compatible equivalents
    setupFiles: ['src/test/stryker-setup.ts'],
  },
});
