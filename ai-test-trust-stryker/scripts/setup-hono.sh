#!/usr/bin/env bash
# Clone Hono at the pinned commit, stage the Buffer tests and Stryker config,
# then install deps. Called by the Harness pipeline and by local validation.
set -euo pipefail

cd "$(dirname "$0")/.."
HONO_SHA=$(cat HONO_COMMIT.txt)

echo "Preparing Hono checkout at $HONO_SHA"
rm -rf .hono
git clone --filter=blob:none https://github.com/honojs/hono.git .hono
cd .hono
git checkout "$HONO_SHA"

echo "Staging Buffer tests + Stryker config"
cp ../tests/buffer.ai.eval.test.ts src/utils/
cp ../tests/buffer.human.test.ts src/utils/
cp ../configs/stryker.config.json .
cp ../configs/vitest.buffer.config.ts .

echo "Installing pnpm 12.6.0 via corepack"
corepack enable
corepack prepare pnpm@12.6.0 --activate

echo "Installing dependencies (frozen lockfile, dev included)"
# Hono's devDeps include @stryker-mutator/core and @stryker-mutator/vitest-runner.
# Force NODE_ENV so pnpm never drops devDependencies in CI.
NODE_ENV=development pnpm install --frozen-lockfile --prod=false

echo "--- post-install node_modules check ---"
ls node_modules/@stryker-mutator/ 2>&1 || true
ls node_modules/.bin/ | grep -E "stryker|vitest" 2>&1 || true

if [ ! -f node_modules/@stryker-mutator/core/bin/stryker.js ]; then
  echo "Stryker not present after pnpm install; falling back to direct install"
  pnpm add -D -w @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1 @stryker-mutator/typescript-checker@10.1.1
fi

echo "Setup complete"
