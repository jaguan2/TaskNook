import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the API runs on Flask (port 5000); proxy /api to it so
// the frontend can use same-origin relative URLs. The preview server gets
// the same proxy — it exists to smoke-test the production build, which is
// pointless if every /api call 404s.
const proxy = {
  "/api": {
    target: "http://localhost:5000",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { proxy },
  build: {
    // Never inline assets as base64: the eager Kenney-render glob was
    // inlining ~40 PNGs into the JS chunk (+33% base64 tax, blocking parse).
    // As real files they cache individually and load in parallel — and this
    // app is local-first, so there's no request-count penalty to fear.
    assetsInlineLimit: 0,
  },
});
