import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Per-file environment via `// @vitest-environment jsdom` pragma; default node.
    environment: "node",
    include: ["packages/*/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.d.ts",
        // Engine + Web Component need a real browser (WebGL/canvas); covered by
        // pure-logic unit tests + the demo build smoke test instead.
        "packages/core/src/engine.ts",
        "packages/core/src/init.ts",
        "packages/viewer/src/opdicom-viewer.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
