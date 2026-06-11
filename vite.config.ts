import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const r = (p: string) => new URL(p, import.meta.url).pathname;

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    cloudflare(),
  ],
  resolve: {
    alias: {
      "@": r("./src/app"),
      "@worker": r("./src/worker"),
    },
  },
  server: {
    watch: {
      // Playwright writes artifacts mid-run; reloading on them kills the suite.
      ignored: ["**/test-results/**", "**/playwright-report/**", "**/shots/**"],
    },
  },
});
