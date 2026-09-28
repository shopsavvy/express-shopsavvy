#!/bin/bash
set -e

if [ ! -f package.json ] || ! grep -q '"name": "express-shopsavvy"' package.json; then
  echo "WARNING: run test.sh from the express-shopsavvy directory"
  exit 1
fi

echo "ShopSavvy Express.js Middleware Tests"
echo "======================================"

echo "Installing dependencies..."
bun install --silent

echo "Typechecking..."
bun run typecheck

echo "Running tests (real Express + real SDK against a local API stand-in)..."
bun run test

echo "Building (CJS + ESM + types)..."
bun run build
for f in dist/index.js dist/index.mjs dist/index.d.ts dist/index.d.mts; do
  [ -f "$f" ] || { echo "  MISSING: $f"; exit 1; }
done

echo "Checking the built package loads in Node (CJS and ESM)..."
node -e 'const m = require("./dist/index.js"); if (typeof m.createShopSavvyRouter !== "function" || typeof m.createShopSavvyClient !== "function") process.exit(1)'
node --input-type=module -e 'const m = await import("./dist/index.mjs"); if (typeof m.createShopSavvyRouter !== "function") process.exit(1)'
echo "  OK"

echo ""
echo "All checks passed"
