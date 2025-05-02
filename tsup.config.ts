import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true, // rolls everything into dist/index.d.ts
  sourcemap: true, // keep them for debugging
  treeshake: true,
  splitting: false, // one file per format
  minify: true,
  target: "es2020",
});
