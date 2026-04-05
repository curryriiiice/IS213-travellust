import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/book-flight-service": {
        target: "http://localhost:5014",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/book-flight-service/, ""),
      },
      "/api/booked-tickets": {
        target: "http://localhost:5006",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/booked-tickets/, ""),
      },
      "/api/hotel-management": {
        target: "http://localhost:5009",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hotel-management/, "/api"),
      },
      "/api/attractions-service": {
        target: "http://localhost:5002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/attractions-service/, "/api"),
      },
      "/api/trips-atomic": {
        target: "http://localhost:5001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trips-atomic/, "/api"),
      },
      "/api": {
        target: "http://localhost:5005",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
