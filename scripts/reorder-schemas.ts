#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Comprehensive script to reorder schema definitions to fix TypeScript dependency issues
 * Performs topological sorting of schema dependencies and handles circular references
 */
function main() {
  const modelsPath = join(process.cwd(), "src/models/index.ts");

  console.log("🔍 Reading models file...");
  let content = readFileSync(modelsPath, "utf-8");

  console.log("🔄 Parsing schema definitions and dependencies...");

  // Extract all schema definitions and their dependencies
  const schemas = extractSchemas(content);
  const dependencies = analyzeDependencies(content, schemas);

  console.log(`📊 Found ${schemas.length} schemas with dependencies`);

  // Perform topological sort
  console.log("🎯 Performing topological sort...");
  const sortedSchemas = topologicalSort(schemas, dependencies);

  // Reorder the content
  console.log("✏️ Reordering schema definitions...");
  const reorderedContent = reorderSchemas(content, sortedSchemas, dependencies);

  // Write the updated content
  writeFileSync(modelsPath, reorderedContent, "utf-8");

  console.log("🎉 Successfully reordered schemas!");
  console.log(
    "💡 All schemas now properly ordered with circular dependencies handled",
  );
}

interface SchemaInfo {
  name: string;
  definition: string;
  startLine: number;
  endLine: number;
}

function extractSchemas(content: string): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const schemaMatch = line.match(/^export const (\w+Schema) = z\./);

    if (schemaMatch) {
      const schemaName = schemaMatch[1];
      const startLine = i;

      // Find the end of this schema definition
      let endLine = startLine;
      let braceCount = 0;
      let inSchema = false;

      for (let j = startLine; j < lines.length; j++) {
        const currentLine = lines[j];

        if (
          currentLine.includes("z.object(") ||
          currentLine.includes("z.enum(")
        ) {
          inSchema = true;
        }

        if (inSchema) {
          braceCount += (currentLine.match(/\{/g) || []).length;
          braceCount -= (currentLine.match(/\}/g) || []).length;

          if (braceCount === 0 && currentLine.includes("}")) {
            endLine = j;
            break;
          }
        }

        // Handle single-line schemas
        if (j === startLine && currentLine.includes(";")) {
          endLine = j;
          break;
        }
      }

      // Look for associated type definition and enum constant
      let finalEndLine = endLine;
      const typeName = schemaName.replace("Schema", "");

      // Check for type definition: export type TypeName = z.infer<typeof TypeNameSchema>;
      for (let k = endLine + 1; k < Math.min(endLine + 10, lines.length); k++) {
        const nextLine = lines[k];

        // Skip empty lines
        if (nextLine.trim() === "") {
          continue;
        }

        // Check for type definition
        if (
          nextLine.match(
            new RegExp(
              `^export type ${typeName} = z\\.infer<typeof ${schemaName}>;`,
            ),
          )
        ) {
          finalEndLine = k;
          continue;
        }

        // Check for enum constant: export const TypeName = { ... } as const;
        if (nextLine.match(new RegExp(`^export const ${typeName} = \\{`))) {
          // Find the end of the enum constant
          let enumBraceCount = 0;
          for (let m = k; m < lines.length; m++) {
            const enumLine = lines[m];
            enumBraceCount += (enumLine.match(/\{/g) || []).length;
            enumBraceCount -= (enumLine.match(/\}/g) || []).length;

            if (enumBraceCount === 0 && enumLine.includes("} as const;")) {
              finalEndLine = m;
              break;
            }
          }
          continue;
        }

        // If we hit another schema or a different export, stop looking
        if (
          nextLine.startsWith("export const") ||
          (nextLine.startsWith("export type") && !nextLine.includes(typeName))
        ) {
          break;
        }
      }

      const definition = lines.slice(startLine, finalEndLine + 1).join("\n");
      schemas.push({
        name: schemaName,
        definition,
        startLine,
        endLine: finalEndLine,
      });
    }
  }

  return schemas;
}

function analyzeDependencies(
  content: string,
  schemas: SchemaInfo[],
): Map<string, Set<string>> {
  const dependencies = new Map<string, Set<string>>();
  const schemaNames = new Set(schemas.map((s) => s.name));

  for (const schema of schemas) {
    const deps = new Set<string>();

    // Find all schema references in this schema's definition
    for (const otherSchemaName of schemaNames) {
      if (
        otherSchemaName !== schema.name &&
        schema.definition.includes(otherSchemaName)
      ) {
        deps.add(otherSchemaName);
      }
    }

    dependencies.set(schema.name, deps);
  }

  return dependencies;
}

function topologicalSort(
  schemas: SchemaInfo[],
  dependencies: Map<string, Set<string>>,
): SchemaInfo[] {
  const sorted: SchemaInfo[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const schemaMap = new Map(schemas.map((s) => [s.name, s]));

  function visit(schemaName: string): void {
    if (visited.has(schemaName)) return;
    if (visiting.has(schemaName)) {
      // Circular dependency detected - this is expected for some schemas
      console.log(`⚠️  Circular dependency detected for ${schemaName}`);
      return;
    }

    visiting.add(schemaName);

    const deps = dependencies.get(schemaName) || new Set();
    for (const dep of deps) {
      if (schemaMap.has(dep)) {
        visit(dep);
      }
    }

    visiting.delete(schemaName);
    visited.add(schemaName);

    const schema = schemaMap.get(schemaName);
    if (schema && !sorted.find((s) => s.name === schemaName)) {
      sorted.push(schema);
    }
  }

  // Visit all schemas
  for (const schema of schemas) {
    visit(schema.name);
  }

  return sorted;
}

function reorderSchemas(
  content: string,
  sortedSchemas: SchemaInfo[],
  dependencies: Map<string, Set<string>>,
): string {
  const lines = content.split("\n");
  let result = "";
  let currentLine = 0;

  // Copy everything before the first schema
  const firstSchemaLine = Math.min(...sortedSchemas.map((s) => s.startLine));
  result += lines.slice(0, firstSchemaLine).join("\n") + "\n";

  // Add schemas in sorted order
  for (const schema of sortedSchemas) {
    let schemaContent = schema.definition;

    // Handle circular dependencies with z.lazy
    const deps = dependencies.get(schema.name) || new Set();
    for (const dep of deps) {
      const depSchema = sortedSchemas.find((s) => s.name === dep);
      if (
        depSchema &&
        sortedSchemas.indexOf(depSchema) > sortedSchemas.indexOf(schema)
      ) {
        // This is a forward reference - wrap with z.lazy
        const regex = new RegExp(`\\b${dep}\\b(?!\\.optional\\(\\))`, "g");
        schemaContent = schemaContent.replace(regex, `z.lazy(() => ${dep})`);
      }
    }

    // Handle self-references for recursive schemas
    if (
      schema.name === "ArticleSearchFilterSchema" ||
      schema.name === "WikipediaSearchFilterSchema"
    ) {
      schemaContent = schemaContent.replace(
        new RegExp(`AND: z\\.array\\(${schema.name}\\)`, "g"),
        `AND: z.array(z.lazy(() => ${schema.name}))`,
      );
      schemaContent = schemaContent.replace(
        new RegExp(`OR: z\\.array\\(${schema.name}\\)`, "g"),
        `OR: z.array(z.lazy(() => ${schema.name}))`,
      );
      schemaContent = schemaContent.replace(
        new RegExp(`NOT: z\\.array\\(${schema.name}\\)`, "g"),
        `NOT: z.array(z.lazy(() => ${schema.name}))`,
      );
    }

    result += schemaContent + "\n\n";
  }

  // Find the last schema's end line and copy everything after
  const lastSchemaLine = Math.max(...sortedSchemas.map((s) => s.endLine));
  const remainingContent = lines.slice(lastSchemaLine + 1).join("\n");
  if (remainingContent.trim()) {
    result += remainingContent;
  }

  return result;
}

if (process.argv[1] === import.meta.url.replace("file://", "")) {
  main();
}
