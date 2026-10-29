import { defineConfig } from "vite";
import { builtinModules } from "node:module";
export default defineConfig({
  build: {
    outDir: ".vite/build",
    emptyOutDir: true,
    lib: {
      entry: "src/main/index.ts",
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rollupOptions: { external: [...builtinModules, /^node:/, "electron"] },
  },
});
