// Render's Start Command may be `node app.js` (run from apps/api). The real
// server is the tsup build output in dist/, so this starts it. `pnpm start`
// (node dist/index.js) is equivalent and is the recommended Start Command.
import { existsSync } from "node:fs";

if (!existsSync(new URL("./dist/index.js", import.meta.url))) {
  console.error(
    "\ndist/index.js is missing: the API hasn't been built.\n" +
      "Render Build Command (Root Directory apps/api): pnpm install --frozen-lockfile && pnpm run build\n",
  );
  process.exit(1);
}

await import("./dist/index.js");
