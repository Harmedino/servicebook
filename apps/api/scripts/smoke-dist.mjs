// Imports the built API and creates the Express app without listening or
// connecting to a database. Proves the bundle loads with only what's in
// node_modules at runtime. Run after `pnpm --filter api build`.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const distUrl = new URL("../dist/", import.meta.url);
const appUrl = new URL("app.js", distUrl);
if (!existsSync(appUrl)) {
  console.error("dist/app.js is missing: run `pnpm --filter api build` first.");
  process.exit(1);
}

// Workspace packages point at TypeScript source, so they must be bundled in.
// Recent Node versions can strip types and would hide a missing bundle here,
// while the host's Node may not, so check the output directly.
const unbundled = readdirSync(distUrl).filter(
  (file) => file.endsWith(".js") && /(?:from|import)\s*\(?\s*["']@servicebook\//.test(readFileSync(new URL(file, distUrl), "utf8")),
);
if (unbundled.length > 0) {
  console.error(`dist/${unbundled.join(", dist/")} imports a workspace package at runtime; add it to noExternal in tsup.config.ts.`);
  process.exit(1);
}

const { createApp } = await import(appUrl.href);
const app = createApp();
if (typeof app?.listen !== "function") {
  console.error("createApp() did not return an Express app.");
  process.exit(1);
}

console.log("API bundle smoke test passed: dist/app.js loads and createApp() works.");
process.exit(0);
