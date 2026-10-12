import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  target: "es2020",
  treeshake: true,
  format: ["esm", "cjs"],
  sourcemap: false,
  clean: true,
  minify: false,
  dts: true, // rolls everything into dist/index.d.mts and dist/index.d.cts
});
