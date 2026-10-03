import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@public": path.resolve(__dirname, "/public"),
      "@src": path.resolve(__dirname, "/src"),
      "@css": path.resolve(__dirname, "/src/css"),
      "@assets": path.resolve(__dirname, "/src/assets"),
      "@components": path.resolve(__dirname, "/src/components"),
      "@routes": path.resolve(__dirname, "/src/routes"),
      "@photos": path.resolve(__dirname, "/public/photos"),
      "@classes": path.resolve(__dirname, "/src/classes"),
      "@primitives": path.resolve(__dirname, "/src/primitives"),
    },
  },
  plugins: [react()],
  server: {
    allowedHosts: ["kahu.dev.aisergateway.dev.br", "kahu.prod.aisergateway.dev.br"],
  },
})
