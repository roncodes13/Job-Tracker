import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "production") {
    const apiBaseUrl = env.VITE_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error("VITE_API_BASE_URL must be set for production builds.");
    }

    let apiUrl;
    try {
      apiUrl = new URL(apiBaseUrl);
    } catch {
      throw new Error("VITE_API_BASE_URL must be a valid HTTPS origin.");
    }

    if (
      apiUrl.protocol !== "https:" ||
      apiUrl.username ||
      apiUrl.password ||
      apiUrl.pathname !== "/" ||
      apiUrl.search ||
      apiUrl.hash
    ) {
      throw new Error("VITE_API_BASE_URL must be an HTTPS origin without a path.");
    }
  }

  return {
    plugins: [react(), tailwindcss()],
  };
});
