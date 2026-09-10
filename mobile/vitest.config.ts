import { defineConfig } from "vitest/config";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".expo/**"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
