import { expect, test, type Page } from "@playwright/test";
import { makeRenderableDicomBase64 } from "./fixtures/renderable-dicom.js";

const DICOM_B64 = makeRenderableDicomBase64();

/** Inject a synthetic renderable DICOM and load it through the public API. */
async function loadSyntheticDicom(page: Page): Promise<number> {
  return page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], "e2e.dcm", { type: "application/dicom" });
    const viewer = document.querySelector("opdicom-viewer") as HTMLElement & {
      loadFiles(files: File[]): Promise<{ imageIds: string[] } | undefined>;
    };
    const result = await viewer.loadFiles([file]);
    return result?.imageIds.length ?? 0;
  }, DICOM_B64);
}

test.beforeEach(async ({ page }) => {
  // Surface uncaught page errors to aid debugging CI failures.
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto("/");
  await expect(page.locator("opdicom-viewer")).toBeVisible();
});

test("mounts the Web Component and its toolbar", async ({ page }) => {
  await expect(page.getByRole("button", { name: "W/L" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Length" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
});

test("decodes and renders a DICOM image", async ({ page }) => {
  const count = await loadSyntheticDicom(page);
  expect(count).toBe(1);

  // Cornerstone appends a <canvas> into the viewport once an image renders.
  const canvas = page.locator("opdicom-viewer canvas");
  await expect(canvas).toBeVisible();

  const size = await canvas.evaluate((c) => {
    const el = c as HTMLCanvasElement;
    return { w: el.width, h: el.height };
  });
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);

  // The "drop a file" hint disappears once an image is shown.
  await expect(page.locator("opdicom-viewer .dropzone")).toHaveClass(/hidden/);
});

test("activates a measurement tool", async ({ page }) => {
  await loadSyntheticDicom(page);
  const length = page.getByRole("button", { name: "Length" });
  await length.click();
  await expect(length).toHaveAttribute("aria-pressed", "true");
  // Activating Length deactivates window/level on the primary binding.
  await expect(page.getByRole("button", { name: "W/L" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("exports the view as a PNG download", async ({ page }) => {
  await loadSyntheticDicom(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PNG" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});
