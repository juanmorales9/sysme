import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "renderer",   // 👈 Aquí se guardará el index.html y los assets
  },
});
