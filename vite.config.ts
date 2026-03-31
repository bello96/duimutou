import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://duimutou.dengjiabei.cn",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
