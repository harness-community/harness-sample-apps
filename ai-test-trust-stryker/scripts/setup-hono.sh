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

echo "Installing dependencies (frozen lockfile)"
# Hono's devDeps already include @stryker-mutator/core and
# @stryker-mutator/vitest-runner, so the lockfile install is sufficient.
pnpm install --frozen-lockfile

echo "Setup complete"
