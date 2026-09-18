#!/usr/bin/env bun

/**
 * Pre-generation step for `scripts/generate.sh`.
 *
 * Downloads the remote Perigon OpenAPI spec and produces a local snapshot
 * at `.openapi-generator/spec.local.json` that the generator consumes.
 *
 * Three transformations are applied, all driven by `scripts/spec-filters.json`:
 *
 *   1. Hidden properties: for each `<Schema>: [<field>, ...]` entry the
 *      matching property is removed from `components.schemas.<Schema>` AND
 *      pulled from its `required` list. As a belt-and-suspenders signal we
 *      also set `x-internal: true` — `templates/modelZodSchema.mustache`
 *      reads this extension and skips the field regardless of whether the
 *      preprocessor succeeded.
 *
 *   2. Excluded paths: every `paths` key that matches a listed minimatch
 *      glob is deleted so those operations never reach the generator.
 *      A pattern with no wildcards is an exact match; use `*` / `**`
 *      (and other minimatch syntax) to cover nested paths.
 *
 *   3. Orphan schemas: after the above, we run a fixed-point pass that
 *      deletes any `components.schemas` entry with zero remaining `$ref`
 *      pointers from anywhere in the spec (excluding self-references).
 *      This handles the cascade where hiding a property (e.g. `vectors`)
 *      or dropping a path (e.g. `/v1/api/monitors`) leaves its referenced
 *      schema unused.
 *
 * Why both layers:
 *   - The template rule makes it visible in version control *why* a field
 *     is hidden (it's a generator-level policy, not a side effect).
 *   - The preprocessor cleans up downstream schemas that the template alone
 *     couldn't reach (orphans are declared in the spec, not at the var level).
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { Minimatch } from "minimatch";
import { z } from "zod";

const SPEC_URL = "https://api.perigon.io/v1/openapi/public-sdk";
const CONFIG_PATH = join(process.cwd(), "scripts/spec-filters.json");
const OUTPUT_PATH = join(process.cwd(), ".openapi-generator/spec.local.json");

// OpenAPI path params use `{uuid}`-style braces, so disable brace expansion.
// Pin POSIX matching so generate does not depend on the host OS.
const MINIMATCH_OPTIONS = {
  nobrace: true,
  nocomment: true,
  platform: "linux",
} as const;

const SpecFiltersConfigSchema = z.object({
  $description: z.string(),
  hiddenFields: z.record(z.string(), z.array(z.string())).default({}),
  excludedPaths: z.array(z.string()).default([]),
});

type SpecFiltersConfig = z.infer<typeof SpecFiltersConfigSchema>;

const OpenApiSchemaSchema = z
  .object({
    properties: z.record(z.string(), z.object({}).passthrough()).optional(),
    required: z.array(z.string()).optional(),
  })
  .passthrough();

const OpenApiSpecSchema = z
  .object({
    paths: z.record(z.string(), z.unknown()).optional(),
    components: z
      .object({
        schemas: z.record(z.string(), OpenApiSchemaSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

type OpenApiSpec = z.infer<typeof OpenApiSpecSchema>;

async function fetchSpec(url: string): Promise<OpenApiSpec> {
  console.log(`🌐 Fetching OpenAPI spec from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch spec: HTTP ${res.status} ${res.statusText}`,
    );
  }
  return OpenApiSpecSchema.parse(await res.json());
}

function loadSpecFilters(path: string): SpecFiltersConfig {
  return SpecFiltersConfigSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
}

function hideProperties(
  spec: OpenApiSpec,
  hidden: Record<string, string[]>,
): { applied: number; missing: string[] } {
  const schemas = spec.components?.schemas ?? {};
  let applied = 0;
  const missing: string[] = [];

  for (const [schemaName, fields] of Object.entries(hidden)) {
    const schema = schemas[schemaName];
    if (!schema) {
      missing.push(`${schemaName} (schema not found)`);
      continue;
    }
    const props = schema.properties ?? {};
    for (const field of fields) {
      const prop = props[field];
      if (!prop) {
        missing.push(`${schemaName}.${field} (property not found)`);
        continue;
      }
      // Belt: leave a breadcrumb for the template's defensive rule.
      prop["x-internal"] = true;
      // Suspenders: delete the property so no downstream `$ref` survives.
      delete props[field];
      if (schema.required) {
        schema.required = schema.required.filter((r) => r !== field);
        if (schema.required.length === 0) delete schema.required;
      }
      applied += 1;
      console.log(`  🔒 Hid ${schemaName}.${field}`);
    }
  }

  return { applied, missing };
}

function excludePaths(
  spec: OpenApiSpec,
  patterns: string[],
): { excluded: string[]; unused: string[] } {
  const paths = spec.paths;
  if (!paths) return { excluded: [], unused: [...patterns] };

  const matchers = patterns.map((pattern) => ({
    pattern,
    matcher: new Minimatch(pattern, MINIMATCH_OPTIONS),
  }));
  const unused = new Set(patterns);
  const excluded: string[] = [];

  for (const path of Object.keys(paths)) {
    let matched = false;
    for (const { pattern, matcher } of matchers) {
      if (!matcher.match(path)) continue;
      unused.delete(pattern);
      matched = true;
    }
    if (!matched) continue;
    delete paths[path];
    excluded.push(path);
    console.log(`  🚫 Excluded path ${path}`);
  }

  return { excluded, unused: [...unused] };
}

/**
 * Walk the entire spec and collect every `$ref` target that is NOT contained
 * within the given schema's own subtree (so that a schema that references
 * itself doesn't look alive on that basis alone).
 */
function collectRefs(node: unknown, acc: Set<string>): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const v of node) collectRefs(v, acc);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === "$ref" && typeof v === "string") {
      acc.add(v);
    } else {
      collectRefs(v, acc);
    }
  }
}

function pruneOrphanSchemas(spec: OpenApiSpec): string[] {
  const schemas = spec.components?.schemas;
  if (!schemas) return [];

  const pruned: string[] = [];

  // Fixed-point: removing one orphan may orphan others. Keep going until stable.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Build a set of all in-use refs, excluding refs coming from inside each
    // candidate schema itself (so pure self-references don't keep a schema alive).
    const allRefs = new Set<string>();
    collectRefs(spec, allRefs);

    let removedThisPass = 0;
    for (const name of Object.keys(schemas)) {
      const target = `#/components/schemas/${name}`;
      if (allRefs.has(target)) {
        // Check whether the only source of this ref is the schema itself.
        // Temporarily remove the schema, recompute refs, and compare.
        const saved = schemas[name];
        delete schemas[name];
        const refsWithoutSelf = new Set<string>();
        collectRefs(spec, refsWithoutSelf);
        if (!refsWithoutSelf.has(target)) {
          pruned.push(name);
          console.log(`  🧹 Pruned orphan schema ${name}`);
          removedThisPass += 1;
          continue; // schema stays deleted
        }
        schemas[name] = saved; // restore
      } else {
        // Completely unreferenced — drop it.
        delete schemas[name];
        pruned.push(name);
        console.log(`  🧹 Pruned orphan schema ${name}`);
        removedThisPass += 1;
      }
    }

    if (removedThisPass === 0) break;
  }

  return pruned;
}

async function main(): Promise<void> {
  const { hiddenFields, excludedPaths } = loadSpecFilters(CONFIG_PATH);
  const hiddenEntries = Object.entries(hiddenFields).flatMap(
    ([schemaName, fields]) => fields.map((field) => `${schemaName}.${field}`),
  );
  console.log(`📋 Loaded spec filters from scripts/spec-filters.json`);
  console.log(
    `  🔒 ${hiddenEntries.length} hidden field(s)` +
      (hiddenEntries.length > 0 ? `: ${hiddenEntries.join(", ")}` : ""),
  );
  console.log(
    `  🚫 ${excludedPaths.length} excluded path pattern(s)` +
      (excludedPaths.length > 0 ? `: ${excludedPaths.join(", ")}` : ""),
  );

  const spec = await fetchSpec(SPEC_URL);
  const { applied, missing } = hideProperties(spec, hiddenFields);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Skipped ${missing.length} hidden-field entry/entries (not present in spec):`,
    );
    for (const m of missing) console.warn(`     - ${m}`);
  }

  const { excluded, unused } = excludePaths(spec, excludedPaths);

  if (unused.length > 0) {
    console.warn(
      `⚠️  Skipped ${unused.length} excluded-path pattern(s) (no matching paths):`,
    );
    for (const pattern of unused) console.warn(`     - ${pattern}`);
  }

  const pruned = pruneOrphanSchemas(spec);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(spec, null, 2), "utf-8");
  console.log(
    `✅ Wrote preprocessed spec to ${OUTPUT_PATH} ` +
      `(${applied} field(s) hidden, ${excluded.length} path(s) excluded, ` +
      `${pruned.length} orphan schema(s) pruned)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
