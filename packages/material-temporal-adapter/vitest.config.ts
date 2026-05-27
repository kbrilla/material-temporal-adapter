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
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/index.ts",
        "src/public-api.ts",
        "src/temporal.d.ts",
        "src/shared/types.ts",
        "src/test-setup.ts",
        "src/tests/**",
      ],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
