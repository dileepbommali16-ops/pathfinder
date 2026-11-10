import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rootDir = process.cwd();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./client/src"),
      "@shared": path.resolve(rootDir, "./shared"),
      "@assets": path.resolve(rootDir, "./attached_assets"),
      "@designcodeio/threeui/style.css": path.resolve(rootDir, "./client/src/shaders/threeui.css"),
      "@designcodeio/threeui": path.resolve(rootDir, "./client/src/shaders/index.ts"),
      "@supabase/supabase-js": path.resolve(rootDir, "./client/src/lib/supabaseClient.ts"),
    },
    dedupe: ["three", "react", "react-dom"],
  },
  root: path.resolve(rootDir, "client"),
  publicDir: path.resolve(rootDir, "client/public"),
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "https://pathfinder-backend-klrp.onrender.com",
        changeOrigin: true,
        secure: true,
      },
      "/agent/ws": {
        target: "wss://pathfinder-backend-klrp.onrender.com",
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: path.resolve(rootDir, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("three") || id.includes("@react-three") || id.includes("@pixiv/three-vrm")) {
              return "vendor-three";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }
            if (id.includes("lucide-react") || id.includes("framer-motion") || id.includes("gsap") || id.includes("@radix-ui")) {
              return "vendor-ui";
            }
            if (id.includes("react-router-dom") || id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
});
