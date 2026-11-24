import { defineConfig } from 'vitest/config'

// Minimal vitest config for the Stryker mutation run.
// Scopes execution to the two buffer test files staged into src/utils/
// by scripts/setup-hono.sh. Avoids Hono's workspace/jsx projects so
// Stryker's vitest runner has a single flat test set to measure.
export default defineConfig({
  test: {
    globals: true,
    include: [
      'src/utils/buffer.ai.eval.test.ts',
      'src/utils/buffer.human.test.ts',
      'src/utils/buffer.test.ts',
    ],
    testTimeout: 30000,
  },
})
