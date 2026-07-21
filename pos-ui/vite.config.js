import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      // Let the plugin register the generated service worker automatically.
      injectRegister: "auto",

      manifest: {
        name: "VENDR",
        short_name: "VENDR",
        description: "Offline-capable point of sale system",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: []
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webmanifest}"
        ],

        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ]
});
