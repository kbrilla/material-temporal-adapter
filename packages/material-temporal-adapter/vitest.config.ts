import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/tests/**/*.spec.ts"],
    typecheck: {
      enabled: true,
      include: ["src/tests/**/*.spec-d.ts"],
      tsconfig: "tsconfig.spec.json",
    },
  },
});
