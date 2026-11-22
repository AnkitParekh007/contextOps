import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL(".",import.meta.url));
export default defineConfig({
  base: "/contextOps/",
  build: {
    outDir:"dist",assetsDir:"assets",sourcemap:false,
    rollupOptions:{input:{
      main:resolve(root,"index.html"),
      demo:resolve(root,"demo/index.html"),
    }},
  },
  server:{port:4173},
});
