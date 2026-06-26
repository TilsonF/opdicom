import { describe, expect, it } from "vitest";
import {
  buildDicomFilename,
  buildExportFilename,
  mimeForFormat,
  normalizeQuality,
  sanitizeFilename,
} from "../src/export.js";

describe("mimeForFormat", () => {
  it("maps formats to MIME types", () => {
    expect(mimeForFormat("png")).toBe("image/png");
    expect(mimeForFormat("jpeg")).toBe("image/jpeg");
  });
});

describe("sanitizeFilename", () => {
  it("strips path separators and illegal characters", () => {
    expect(sanitizeFilename("CT/Chest:1*?")).toBe("CT_Chest_1");
    expect(sanitizeFilename("a\\b<c>d|e")).toBe("a_b_c_d_e");
  });

  it("collapses whitespace and underscores, trims edges", () => {
    expect(sanitizeFilename("  hello   world  ")).toBe("hello_world");
    expect(sanitizeFilename("__lead.trail__")).toBe("lead.trail");
  });
});

describe("buildExportFilename", () => {
  it("adds the right extension per format", () => {
    expect(buildExportFilename("scan", "png")).toBe("scan.png");
    expect(buildExportFilename("scan", "jpeg")).toBe("scan.jpg");
  });

  it("replaces an existing image extension", () => {
    expect(buildExportFilename("study.png", "jpeg")).toBe("study.jpg");
    expect(buildExportFilename("study.JPG", "png")).toBe("study.png");
  });

  it("falls back to a default when empty after sanitization", () => {
    expect(buildExportFilename("", "png")).toBe("opdicom-export.png");
    expect(buildExportFilename("///", "png")).toBe("opdicom-export.png");
    expect(buildExportFilename(undefined, "jpeg")).toBe("opdicom-export.jpg");
  });
});

describe("buildDicomFilename", () => {
  it("adds a .dcm extension", () => {
    expect(buildDicomFilename("series-3")).toBe("series_3.dcm");
  });

  it("replaces an existing .dcm extension", () => {
    expect(buildDicomFilename("scan.dcm")).toBe("scan.dcm");
    expect(buildDicomFilename("scan.DCM")).toBe("scan.dcm");
  });

  it("falls back to a default when empty", () => {
    expect(buildDicomFilename("")).toBe("opdicom-instance.dcm");
    expect(buildDicomFilename(undefined)).toBe("opdicom-instance.dcm");
  });
});

describe("normalizeQuality", () => {
  it("defaults to 0.92 for undefined / non-finite", () => {
    expect(normalizeQuality(undefined)).toBe(0.92);
    expect(normalizeQuality(Number.NaN)).toBe(0.92);
  });

  it("clamps to 0..1", () => {
    expect(normalizeQuality(0.5)).toBe(0.5);
    expect(normalizeQuality(-1)).toBe(0);
    expect(normalizeQuality(5)).toBe(1);
  });
});
