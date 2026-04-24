#!/usr/bin/env bun

/**
 * Post-processing step for `scripts/generate.sh`.
 *
 * Every operation in the Perigon OpenAPI spec is tagged `v1`, which means
 * `V1Api.ts` is the canonical API class and already contains every operation.
 *
 * Some operations are also tagged with a secondary tag (e.g. `Source Groups`,
 * `Watchlists`). OpenAPI Generator emits one class per tag, so those
 * operations end up in per-tag files (e.g. `SourceGroupsApi.ts`) as well.
 * Because those files re-declare the same request/body/path/query schemas
 * and types, a wildcard re-export from `src/apis/index.ts` produces
 * TS2308 "duplicate export" errors for every duplicated symbol.
 *
 * The simplest, stable fix is to:
 *   1. Delete every API file except the canonical `V1Api.ts`.
 *   2. Rewrite `src/apis/index.ts` to only re-export from `V1Api`.
 *
 * Users instantiate `new V1Api(config)` and gain access to every operation.
 */
import { readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

const APIS_DIR = join(process.cwd(), "src/apis");
const CANONICAL = "V1Api.ts";
const INDEX = "index.ts";

function main(): void {
  let removed = 0;
  for (const file of readdirSync(APIS_DIR)) {
    if (!file.endsWith(".ts")) continue;
    if (file === CANONICAL || file === INDEX) continue;
    unlinkSync(join(APIS_DIR, file));
    console.log(`🗑️  Removed duplicate per-tag API file: ${file}`);
    removed += 1;
  }

  writeFileSync(
    join(APIS_DIR, INDEX),
    "/* tslint:disable */\n\nexport * from './V1Api';\n",
    "utf-8",
  );
  console.log("✅ Rewrote src/apis/index.ts to export only V1Api");

  if (removed === 0) {
    console.log("ℹ️  No per-tag API files to remove");
  }
}

main();
