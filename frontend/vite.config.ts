import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon-32.png",
        "apple-touch-icon.png",
        "offline.html",
      ],
      manifest: {
        id: "/",
        name: "ChatSnap",
        short_name: "ChatSnap",
        description:
          "Not Snap. Ours. Bilingual EN/FR snaps, stories, chat — friends first.",
        lang: "en",
        dir: "ltr",
        theme_color: "#0A0A0A",
        background_color: "#0A0A0A",
        display: "standalone",
        display_override: ["standalone", "browser"],
        orientation: "portrait-primary",
        start_url: "/app",
        scope: "/",
        categories: ["social", "photo"],
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
        shortcuts: [
          {
            name: "Camera",
            short_name: "Camera",
            description: "Open camera",
            url: "/app",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Inbox",
            short_name: "Inbox",
            url: "/app/inbox",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Chat",
            short_name: "Chat",
            url: "/chats",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        // App shell only — never cache private API/media
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/offline\.html$/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        runtimeCaching: [
          {
            // Never cache Supabase / Mux / signed media
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") ||
              url.hostname.includes("supabase.in") ||
              url.hostname.includes("mux.com") ||
              url.pathname.includes("/storage/") ||
              url.pathname.includes("/rest/v1/") ||
              url.pathname.includes("/auth/v1/") ||
              url.pathname.includes("/realtime/"),
            handler: "NetworkOnly",
          },
          {
            // OSM map tiles — short cache OK
            urlPattern: ({ url }) =>
              url.hostname.includes("tile.openstreetmap.org"),
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            // Google fonts if any later
            urlPattern: ({ url }) =>
              url.hostname === "fonts.googleapis.com" ||
              url.hostname === "fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
});
