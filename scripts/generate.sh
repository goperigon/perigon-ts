#!/usr/bin/env bash
set -euo pipefail

# 1. Pre-process: download the remote Perigon OpenAPI spec and apply the
#    filters in `scripts/spec-filters.json` (hidden fields + excluded paths).
#    The resulting snapshot is written to `.openapi-generator/spec.local.json`.
#    Our Mustache templates skip vars marked x-internal, so those fields
#    never reach the generated TypeScript surface.
bun run scripts/preprocess-spec.ts

# 2. Run OpenAPI Generator against the *local* preprocessed spec using our
#    custom Mustache templates under `templates/`.
bunx @openapitools/openapi-generator-cli generate \
  -g typescript-fetch \
  -i .openapi-generator/spec.local.json \
  -t templates/ \
  -c ts-fetch.config.json

# 3. Topologically sort model schemas and break circular refs.
bun run scripts/reorder-schemas.ts

# 4. Remove per-tag API files that duplicate V1Api.ts, and collapse
#    src/apis/index.ts to a single canonical re-export.
bun run scripts/dedupe-apis.ts

# 5. Lint & format. Quote the glob so the shell (on bash 3.2 without
#    globstar) doesn't expand it badly — let ESLint resolve it instead.
bunx eslint 'src/**/*.ts' --fix
bunx prettier --write "**/*.{ts,js,json,md}"

# 6. Refresh the README table of contents.
bunx doctoc README.md --github --maxlevel 2

# 7. Fail loudly if the generated output doesn't typecheck.
bunx tsc --noEmit
