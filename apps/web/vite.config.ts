import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };

  // A production build without VITE_API_URL would quietly call localhost from
  // users' browsers. Fail the build (e.g. on Vercel) with a clear message instead.
  if (command === "build" && mode === "production") {
    const apiUrl = env.VITE_API_URL?.trim();
    if (!apiUrl) {
      throw new Error(
        "VITE_API_URL is not set. Add it in Vercel → Project → Settings → Environment Variables " +
          "(e.g. https://your-api.onrender.com), then redeploy.",
      );
    }
    if (!/^https?:\/\/[^\s]+$/.test(apiUrl)) {
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
