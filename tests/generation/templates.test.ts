import { spawnSync } from "child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { reorderModels } from "../../scripts/reorder-schemas";
import { spec } from "./fixture";

// Needs Java for openapi-generator.
const root = join(__dirname, "../..");
const hasJava = spawnSync("java", ["-version"]).status === 0;

(hasJava ? describe : describe.skip)("templates", () => {
  let dir: string;
  let models: Record<string, { parse(value: unknown): unknown }>;
  let modelsSource: string;

  beforeAll(async () => {
    mkdirSync(join(root, ".cache"), { recursive: true });
    dir = mkdtempSync(join(root, ".cache/templates-"));
    writeFileSync(join(dir, "spec.json"), JSON.stringify(spec));

    const generated = spawnSync(
      "bunx",
      [
        "@openapitools/openapi-generator-cli",
        "generate",
        "-g",
        "typescript-fetch",
        "-i",
        join(dir, "spec.json"),
        "-t",
        join(root, "templates"),
        "-c",
        join(root, "ts-fetch.config.json"),
        "-o",
        join(dir, "out"),
      ],
      { cwd: root, encoding: "utf-8" },
    );
    if (generated.status !== 0) {
      throw new Error(generated.stdout + generated.stderr);
    }

    const modelsPath = join(dir, "out/src/models/index.ts");
    const log = console.log;
    console.log = () => undefined;
    try {
      modelsSource = reorderModels(readFileSync(modelsPath, "utf-8"));
    } finally {
      console.log = log;
    }
    writeFileSync(modelsPath, modelsSource);
    models = await import(modelsPath);
  }, 120_000);

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("produces models that typecheck", () => {
    const tsc = spawnSync(
      "bunx",
      [
        "tsc",
        "--ignoreConfig",
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--target",
        "es2022",
        "--module",
        "esnext",
        "--moduleResolution",
        "bundler",
        "out/src/models/index.ts",
      ],
      { cwd: dir, encoding: "utf-8" },
    );
    expect(tsc.stdout + tsc.stderr).toBe("");
  });

  it("includes inherited properties in subtype schemas", () => {
    expect(
      models.DogSchema.parse({ kind: "DOG", name: "Rex", barks: true }),
    ).toEqual({ kind: "DOG", name: "Rex", barks: true });
  });

  it("discriminates polymorphic properties by their mapping", () => {
    const owner = {
      mammal: { kind: "DOG", name: "Rex", barks: false },
      mammals: { a: { kind: "CAT", lives: 3 } },
    };

    expect(models.OwnerSchema.parse(owner)).toEqual(owner);
    expect(() =>
      models.OwnerSchema.parse({ mammal: { kind: "DOG" } }),
    ).toThrow();
    expect(() =>
      models.OwnerSchema.parse({ mammal: { kind: "BIRD" } }),
    ).toThrow();
  });

  it("accepts every option of a union without a discriminator", () => {
    for (const anything of [
      { kind: "DOG", barks: true },
      [{ kind: "CAT", lives: 1 }],
      [true, false],
      "text",
      7,
    ]) {
      expect(models.AnythingSchema.parse(anything)).toEqual(anything);
    }
    expect(() => models.AnythingSchema.parse(false)).toThrow();
  });

  it("does not fall back to z.unknown()", () => {
    expect(modelsSource).not.toContain("z.unknown()");
  });
});
