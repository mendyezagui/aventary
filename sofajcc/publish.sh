#!/usr/bin/env bash
# Safe publish for sofajcc.org → Cloudflare Pages.
#
# Why this exists: `wrangler pages deploy <dir>` uploads EVERYTHING in <dir>
# except node_modules. `.assetsignore` is NOT honored for Pages, so deploying
# the source folder directly would publicly serve package.json, the Tailwind
# config, schema.sql, and any local env files. This script assembles a clean
# publish directory (.pages-dist) containing ONLY publishable files, then
# deploys that.
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...      # needs Pages:Edit (+ D1:Edit for db work)
#   export CLOUDFLARE_ACCOUNT_ID=3ce1454beb9c83c90403c54e0855e4f9
#   ./publish.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ building Tailwind CSS"
npm run build:css

echo "→ assembling clean publish dir (.pages-dist)"
rm -rf .pages-dist && mkdir -p .pages-dist
cp ./*.html .pages-dist/
cp _headers _redirects robots.txt sitemap.xml .pages-dist/
cp -r assets .pages-dist/
cp -r functions .pages-dist/

# Never publish: node_modules, package*.json, tailwind.config.js, tw-input.css,
# schema.sql, README.md, .git, .assetsignore, .gitignore, or any *.env file.
# (They are simply never copied into .pages-dist above.)

echo "→ deploying to Cloudflare Pages (production branch: main)"
npx wrangler@4 pages deploy .pages-dist --project-name sofajcc --branch main --commit-dirty=true

echo "✓ done"
