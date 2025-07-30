#!/usr/bin/env bash
set -e
npx @openapitools/openapi-generator-cli generate \
  -g typescript-fetch \
  -i https://api.perigon.io/v1/openapi/public-sdk \
  -t templates/ \
  -c ts-fetch.config.json

bun run scripts/reorder-schemas.ts

npx prettier --write "**/*.{ts,js,json,md}"
npx doctoc README.md --github --maxlevel 2
