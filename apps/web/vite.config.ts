import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };

  // Without VITE_API_URL the deployed app would call localhost from users'
  // browsers. Warn loudly in the build log, but never fail the deployment.
  if (command === "build" && mode === "production") {
    const apiUrl = env.VITE_API_URL?.trim();
    if (!apiUrl || !/^https?:\/\/[^\s]+$/.test(apiUrl)) {
      console.warn(
        `\n⚠ VITE_API_URL is ${apiUrl ? `invalid ("${apiUrl}")` : "not set"}. The app will call http://localhost:4000.\n` +
          "  Set it in Vercel → Project → Settings → Environment Variables (e.g. https://your-api.onrender.com), then redeploy.\n",
      );
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
    },
  };
});
