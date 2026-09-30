import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./lib/auth-context";
import { ServerStatus } from "./components/ServerStatus";
import { App } from "./App";
// Self-hosted variable fonts: no third-party request, no layout shift waiting on Google.
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Transitions keep the current page on screen while the next one loads,
            instead of swapping the whole screen for a spinner. */}
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
          <ServerStatus />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
