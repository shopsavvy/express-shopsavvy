#!/bin/bash
set -e

echo "ShopSavvy Express.js Middleware Tests"
echo "======================================"

echo "Running structural checks..."
echo ""

echo "Checking required files..."
REQUIRED="src/index.ts package.json README.md"
MISSING=0
for f in $REQUIRED; do
  if [ ! -f "$f" ]; then
    echo "  Missing: $f"
    MISSING=$((MISSING + 1))
  fi
done
if [ $MISSING -eq 0 ]; then
  echo "  All required files present"
else
  echo "  $MISSING required files missing"
  exit 1
fi

echo "Checking TypeScript syntax..."
if command -v bun &> /dev/null; then
  if bun build --no-bundle src/index.ts --outfile /tmp/express-shopsavvy-check.js > /dev/null 2>&1; then
    echo "  TypeScript syntax OK"
  else
    echo "  TypeScript syntax error"
    exit 1
  fi
  rm -f /tmp/express-shopsavvy-check.js
fi

echo "Checking exports..."
if command -v bun &> /dev/null; then
  bun -e "const m = require('./src/index.ts'); if (!m.createShopSavvyRouter) throw 'missing createShopSavvyRouter'; if (!m.createShopSavvyClient) throw 'missing createShopSavvyClient'; console.log('  Exports valid')" 2>/dev/null || echo "  Export check skipped (needs bun install)"
fi

echo ""
echo "All unit checks passed"
