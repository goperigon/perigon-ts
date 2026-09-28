import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  target: "es2020",
  treeshake: true,
  format: ["esm", "cjs"],
  sourcemap: true, // keep them for debugging
  clean: false,
  minify: true,
  dts: true, // rolls everything into dist/index.d.ts
});
