import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // The app shipped as one ~3 MB chunk, which the browser had to fetch
        // and parse in full before anything rendered. Splitting the heavy,
        // rarely-changing libraries out means they cache independently of our
        // code: an edit to the site no longer invalidates Mapbox for every
        // returning visitor, and the browser parses the pieces in parallel.
        // Only the framework is pinned. Everything else is left to Rollup:
        // forcing libraries into named chunks defeated the route-level code
        // splitting below, pulling the editor onto the public critical path.
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
          mapbox: ["mapbox-gl"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
