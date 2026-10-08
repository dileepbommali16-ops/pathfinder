import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Safely load dev-only plugins without breaking production builds if absent
let jsxLocPlugin: () => Plugin = () => ({ name: "noop-jsx-loc" });
try {
  const mod = require("@builder.io/vite-plugin-jsx-loc");
  if (mod && mod.jsxLocPlugin) jsxLocPlugin = mod.jsxLocPlugin;
} catch {
  /* dev plugin optional */
}

const plugins = [react(), tailwindcss(), jsxLocPlugin()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@designcodeio/threeui/style.css": path.resolve(import.meta.dirname, "client", "src", "shaders", "threeui.css"),
      "@designcodeio/threeui": path.resolve(import.meta.dirname, "client", "src", "shaders", "index.ts"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
