import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    // Local dev: route /api through Vite so the browser talks to one origin
    // (Chrome's Private Network Access blocks loopback->loopback fetches).
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/database"],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "CooperWeb — ECZ Grade 7 Past Papers",
        short_name: "CooperWeb",
        description: "Free Zambian ECZ Grade 7 past examination papers.",
        theme_color: "#0f766e",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // Without this the SW answers this navigation with index.html, and
        // Android's Digital Asset Links check cannot read assetlinks.json.
        navigateFallbackDenylist: [/^\/\.well-known\//],
      },
    }),
  ],
});
