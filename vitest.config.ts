import {defineConfig} from "vitest/config";

export default defineConfig({
  test:{
    include:["tests/**/*.test.ts"],
    exclude:["marketing/**","node_modules/**",".next/**"],
  },
});
