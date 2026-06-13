// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',

  // Chỉ mutate pure utility files — tránh CF binding code (DB, R2, KV).
  // enforce(), keyMatch, error factories là pure functions, ideal cho mutation testing.
  mutate: [
    'src/utils/rbac.ts',
    'src/utils/errors.ts',
    'src/utils/errorHandler.ts',
    '!src/utils/logger.ts',        // logging side effects, skip
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],

  vitest: {
    // Dùng config riêng cho stryker: standard node env để tránh complexity của CF pool.
    // Test thuần logic, không cần CF bindings.
    configFile: 'vitest.stryker.config.mts',
  },

  // Thresholds: nếu < 70% mutations bị kill thì fail CI
  thresholds: {
    high: 80,
    low: 70,
    break: 60,
  },

  // Tăng tốc: bỏ qua mutations trong block comments
  ignoreStatic: true,

  // Tối đa 4 concurrent test runners
  concurrency: 4,

  // Report HTML output vào thư mục riêng
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
};
