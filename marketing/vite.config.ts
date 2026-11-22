import { defineConfig } from "vite";
export default defineConfig({
  base: "/contextOps/",
  build: { outDir: "dist", assetsDir: "assets", sourcemap: false },
  server: { port: 4173 }
});
