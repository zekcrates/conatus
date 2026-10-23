import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const repositoryRoot = "..";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: [repositoryRoot] },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
  },
});
