import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };

  // Without VITE_API_URL the app would call localhost from users' browsers.
  // Production deployments must set it, so fail those builds with a clear
  // message. Vercel preview builds only warn, so they still deploy.
  if (command === "build" && mode === "production") {
    const apiUrl = env.VITE_API_URL?.trim();
    if (!apiUrl) {
      const message =
        "VITE_API_URL is not set. Add it in Vercel → Project → Settings → Environment Variables " +
        "(e.g. https://your-api.onrender.com), then redeploy.";
      if (env.VERCEL_ENV === "production" || !env.VERCEL) {
        throw new Error(message);
      }
      console.warn(`\n⚠ ${message}\n`);
    } else if (!/^https?:\/\/[^\s]+$/.test(apiUrl)) {
      throw new Error(`VITE_API_URL must be a full URL like https://your-api.onrender.com (got "${apiUrl}").`);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
    },
  };
});
