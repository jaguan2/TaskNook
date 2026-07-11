import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the API runs on Flask (port 5000); proxy /api to it so
// the frontend can use same-origin relative URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
