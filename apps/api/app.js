// Render's Start Command may be `node app.js` (run from apps/api). The real
// server is the tsup build output, so this just starts it. `pnpm start`
// (node dist/index.js) is equivalent and is the recommended Start Command.
import "./dist/index.js";
