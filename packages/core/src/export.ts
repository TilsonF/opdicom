/** Raster image formats OpDICOM can export the viewport to. */
export type ImageFormat = "png" | "jpeg";

export interface ExportOptions {
  /** Output format. Default "png". */
  format?: ImageFormat;
  /** JPEG quality in 0..1 (ignored for PNG). Default 0.92. */
  quality?: number;
  /** Burn measurement/annotation overlays into the image. Default true. */
  withAnnotations?: boolean;
  /** File name (with or without extension) for downloads. */
  filename?: string;
}

const MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
};

/** MIME type for a format. */
export function mimeForFormat(format: ImageFormat): string {
  return MIME[format];
}

/**
 * Make a string safe to use as a file name: strip path separators and
 * characters illegal on common filesystems, collapse runs of separators, and
 * trim leading/trailing separators.
 *
 * Input is length-bounded first and the trim is a linear scan (no anchored `+`
 * alternation) to avoid polynomial-ReDoS on adversarial names.
 */
export function sanitizeFilename(name: string): string {
  const collapsed = name
    .slice(0, 200)
    .replace(/[\s\\/:*?"<>|-]/g, "_")
    .replace(/_+/g, "_");

  let start = 0;
  let end = collapsed.length;
  const isTrim = (c: string): boolean => c === "_" || c === ".";
  while (start < end && isTrim(collapsed[start]!)) start++;
  while (end > start && isTrim(collapsed[end - 1]!)) end--;
  return collapsed.slice(start, end);
}

/**
 * Build a download file name with the correct extension. Falls back to a
 * sensible default when `base` is empty after sanitization.
 */
export function buildExportFilename(
  base: string | undefined,
  format: ImageFormat,
): string {
  const ext = format === "jpeg" ? "jpg" : "png";
  const cleaned = base ? sanitizeFilename(base.replace(/\.(png|jpe?g)$/i, "")) : "";
  const stem = cleaned.length > 0 ? cleaned : "opdicom-export";
  return `${stem}.${ext}`;
}

/**
 * Build a download file name for a raw DICOM instance (`.dcm`). Falls back to a
 * sensible default when `base` is empty after sanitization.
 */
export function buildDicomFilename(base: string | undefined): string {
  const cleaned = base ? sanitizeFilename(base.replace(/\.dcm$/i, "")) : "";
  const stem = cleaned.length > 0 ? cleaned : "opdicom-instance";
  return `${stem}.dcm`;
}

/** Clamp an optional JPEG quality into the valid 0..1 range. */
export function normalizeQuality(quality: number | undefined): number {
  if (quality === undefined || !Number.isFinite(quality)) return 0.92;
  return Math.min(Math.max(quality, 0), 1);
}
