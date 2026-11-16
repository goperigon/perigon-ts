import { reorderModels } from "../../scripts/reorder-schemas";

const models = `import { z } from "zod";

export const DataSchemaValueSchema = z.object({
  shape: ShapeSchema,
});

export type DataSchemaValue = z.infer<typeof DataSchemaValueSchema>;

export const ShapeSchema = z.discriminatedUnion("type", [
  z.lazy(() => CircleSchema.extend({ type: z.literal("CIRCLE") })),
  z.lazy(() => SquareSchema.extend({ type: z.literal("SQUARE") })),
]);

export type Shape = z.infer<typeof ShapeSchema>;

export const ValueSchema = z.union([
  CircleSchema,
  z.array(SquareSchema),
  z.string(),
]);

export type Value = z.infer<typeof ValueSchema>;

export const CircleSchema = z.object({
  type: z.string(),
  radius: z.number(),
});

export type Circle = z.infer<typeof CircleSchema>;

export const SquareSchema = z.object({
  type: z.string(),
  side: z.number(),
});

export type Square = z.infer<typeof SquareSchema>;
`;

const declarationIndex = (content: string, name: string) =>
  content.indexOf(`export const ${name} = `);

describe("reorderModels", () => {
  let output: string;

  beforeAll(() => {
    const log = console.log;
    console.log = () => undefined;
    try {
      output = reorderModels(models);
    } finally {
      console.log = log;
    }
  });

  it("keeps every schema and type exactly once", () => {
    for (const name of [
      "Shape",
      "Value",
      "Circle",
      "Square",
      "DataSchemaValue",
    ]) {
      expect(output.split(`export const ${name}Schema = `)).toHaveLength(2);
      expect(output.split(`export type ${name} = `)).toHaveLength(2);
    }
  });

  it("moves union members ahead of the unions that use them", () => {
    for (const union of ["ShapeSchema", "ValueSchema"]) {
      for (const member of ["CircleSchema", "SquareSchema"]) {
        expect(declarationIndex(output, member)).toBeLessThan(
          declarationIndex(output, union),
        );
      }
    }
  });

  it("does not replace resolvable references with z.unknown()", () => {
    expect(output).not.toContain("z.unknown()");
  });

  it("keeps union blocks intact", () => {
    expect(output).toContain(`export const ValueSchema = z.union([
  CircleSchema,
  z.array(SquareSchema),
  z.string(),
]);

export type Value = z.infer<typeof ValueSchema>;`);
  });
});
