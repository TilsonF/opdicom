import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config: builds & serves the demo app, then drives it in a real browser to
 * validate that the viewer actually decodes and renders DICOM (not just unit
 * logic). Uses the Vite dev server on port 5180.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "html",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5180",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Force software WebGL so Cornerstone renders in headless CI (no GPU).
        launchOptions: {
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
          ],
        },
      },
    },
  ],
  webServer: {
    // Run against the production build (preview) so bundled web workers / WASM
    // codecs resolve exactly as they do for consumers — the Vite dev server's
    // worker resolution is unreliable with pnpm-linked packages.
    command:
      "pnpm --filter @opdicom/demo build && pnpm --filter @opdicom/demo preview",
    url: "http://localhost:5180",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
