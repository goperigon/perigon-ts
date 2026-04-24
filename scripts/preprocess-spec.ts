#!/usr/bin/env bun

/**
 * Pre-generation step for `scripts/generate.sh`.
 *
 * Downloads the remote Perigon OpenAPI spec and produces a local snapshot
 * at `.openapi-generator/spec.local.json` that the generator consumes.
 *
 * Two transformations are applied, both driven by `scripts/hidden-fields.json`:
 *
 *   1. Hidden properties: for each `<Schema>: [<field>, ...]` entry the
 *      matching property is removed from `components.schemas.<Schema>` AND
 *      pulled from its `required` list. As a belt-and-suspenders signal we
 *      also set `x-internal: true` — `templates/modelZodSchema.mustache`
 *      reads this extension and skips the field regardless of whether the
 *      preprocessor succeeded.
 *
 *   2. Orphan schemas: after the above, we run a fixed-point pass that
 *      deletes any `components.schemas` entry with zero remaining `$ref`
 *      pointers from anywhere in the spec (excluding self-references).
 *      This handles the cascade where hiding a property (e.g. `vectors`)
 *      leaves its referenced schema (e.g. `VectorData`) unused.
 *
 * Why both layers:
 *   - The template rule makes it visible in version control *why* a field
 *     is hidden (it's a generator-level policy, not a side effect).
 *   - The preprocessor cleans up downstream schemas that the template alone
 *     couldn't reach (orphans are declared in the spec, not at the var level).
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

const SPEC_URL = "https://api.perigon.io/v1/openapi/public-sdk";
const CONFIG_PATH = join(process.cwd(), "scripts/hidden-fields.json");
const OUTPUT_PATH = join(process.cwd(), ".openapi-generator/spec.local.json");

interface HiddenFieldsConfig {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  $description?: string;
  [schemaName: string]: string[] | string | undefined;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

interface OpenApiSchema {
  properties?: Record<string, Record<string, JsonValue>>;
  required?: string[];
  [key: string]: JsonValue | undefined;
}

interface OpenApiSpec {
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
  [key: string]: unknown;
}

async function fetchSpec(url: string): Promise<OpenApiSpec> {
  console.log(`🌐 Fetching OpenAPI spec from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch spec: HTTP ${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as OpenApiSpec;
}

function loadHiddenFields(path: string): Record<string, string[]> {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as HiddenFieldsConfig;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("$")) continue; // metadata keys
    if (Array.isArray(value)) out[key] = value;
  }
  return out;
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

/**
 * Walk the entire spec and collect every `$ref` target that is NOT contained
 * within the given schema's own subtree (so that a schema that references
 * itself doesn't look alive on that basis alone).
 */
function collectRefs(node: JsonValue, acc: Set<string>): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const v of node) collectRefs(v, acc);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === "$ref" && typeof v === "string") {
      acc.add(v);
    } else {
      collectRefs(v as JsonValue, acc);
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
    collectRefs(spec as unknown as JsonValue, allRefs);

    let removedThisPass = 0;
    for (const name of Object.keys(schemas)) {
      const target = `#/components/schemas/${name}`;
      if (allRefs.has(target)) {
        // Check whether the only source of this ref is the schema itself.
        // Temporarily remove the schema, recompute refs, and compare.
        const saved = schemas[name];
        delete schemas[name];
        const refsWithoutSelf = new Set<string>();
        collectRefs(spec as unknown as JsonValue, refsWithoutSelf);
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
  const hidden = loadHiddenFields(CONFIG_PATH);
  const configuredCount = Object.values(hidden).reduce(
    (acc, fields) => acc + fields.length,
    0,
  );
  console.log(
    `📋 Loaded ${configuredCount} hidden field(s) from scripts/hidden-fields.json`,
  );

  const spec = await fetchSpec(SPEC_URL);
  const { applied, missing } = hideProperties(spec, hidden);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Skipped ${missing.length} hidden-field entry/entries (not present in spec):`,
    );
    for (const m of missing) console.warn(`     - ${m}`);
  }

  const pruned = pruneOrphanSchemas(spec);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(spec, null, 2), "utf-8");
  console.log(
    `✅ Wrote preprocessed spec to ${OUTPUT_PATH} ` +
      `(${applied} field(s) hidden, ${pruned.length} orphan schema(s) pruned)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
