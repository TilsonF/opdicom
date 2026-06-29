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
        // Modules that need a real browser (WebGL/canvas) or Cornerstone runtime
        // can't be unit-tested; they're covered by the Playwright E2E suite.
        // Pure logic (parser, geometry, voi, cine, export, tools, layout,
        // colormaps, dicomweb, i18n) is unit-tested.
        "packages/core/src/engine.ts",
        "packages/core/src/init.ts",
        "packages/core/src/mpr.ts",
        "packages/core/src/sync.ts",
        "packages/core/src/render-engine.ts",
        "packages/core/src/files.ts",
        "packages/core/src/colormap-names.ts",
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
