import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Backend runs on :8000 (uvicorn app.main:app --reload)
    proxy: { "/api": "http://localhost:8000" },
  },
});
