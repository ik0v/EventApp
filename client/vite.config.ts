import { defineConfig } from "vitest/config";
import reactVite from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [reactVite()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/*.css"],
    },
  },
});
