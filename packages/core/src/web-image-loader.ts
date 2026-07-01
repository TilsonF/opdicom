import { encodeRgbDicom } from "./web-image.js";

/**
 * Rasterize a plain web image (PNG/JPEG/…) Blob in the browser and wrap its
 * pixels in an RGB DICOM buffer so it can flow through the normal viewer path.
 * Browser-only (needs canvas); covered by the E2E suite.
 */
export async function imageFileToDicom(file: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("OpDICOM: 2D canvas context unavailable");
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height); // RGBA
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      rgb[j] = data[i]!;
      rgb[j + 1] = data[i + 1]!;
      rgb[j + 2] = data[i + 2]!;
    }
    return encodeRgbDicom(rgb, height, width);
  } finally {
    bitmap.close();
  }
}
