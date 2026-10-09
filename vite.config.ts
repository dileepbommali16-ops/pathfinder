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

const rootDir = import.meta.dirname ?? process.cwd();

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "client", "src"),
      "@shared": path.resolve(rootDir, "shared"),
      "@assets": path.resolve(rootDir, "attached_assets"),
      "@designcodeio/threeui/style.css": path.resolve(rootDir, "client", "src", "shaders", "threeui.css"),
      "@designcodeio/threeui": path.resolve(rootDir, "client", "src", "shaders", "index.ts"),
    },
  },
  envDir: path.resolve(rootDir),
  root: path.resolve(rootDir, "client"),
  publicDir: path.resolve(rootDir, "client", "public"),
  build: {
    outDir: path.resolve(rootDir, "dist"),
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
