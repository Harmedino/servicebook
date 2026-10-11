import { defineConfig } from "tsup";

// app.ts is its own entry so scripts/smoke-dist.mjs can import createApp()
// from the bundle without starting the server.
export default defineConfig({
  entry: ["src/index.ts", "src/app.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
});
