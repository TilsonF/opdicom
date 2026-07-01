import { describe, expect, it } from "vitest";
import { OpDicomParser } from "@opdicom/parser";
import {
  encodeRgbDicom,
  hasDicomMagic,
  isWebImageType,
} from "../src/web-image.js";

describe("hasDicomMagic", () => {
  it("detects the DICM preamble at offset 128", () => {
    const buf = new Uint8Array(132);
    buf.set(new TextEncoder().encode("DICM"), 128);
    expect(hasDicomMagic(buf)).toBe(true);
  });

  it("returns false for non-DICOM / short buffers", () => {
    expect(hasDicomMagic(new Uint8Array([137, 80, 78, 71]))).toBe(false); // PNG header
    expect(hasDicomMagic(new Uint8Array(10))).toBe(false);
  });
});

describe("isWebImageType", () => {
  it("recognizes image mime types", () => {
    expect(isWebImageType("image/png", undefined)).toBe(true);
    expect(isWebImageType("image/jpeg", "x")).toBe(true);
  });

  it("recognizes image extensions", () => {
    expect(isWebImageType(undefined, "scan.PNG")).toBe(true);
    expect(isWebImageType("", "photo.jpg")).toBe(true);
    expect(isWebImageType("", "a.webp")).toBe(true);
  });

  it("rejects DICOM and unknowns", () => {
    expect(isWebImageType("application/dicom", "a.dcm")).toBe(false);
    expect(isWebImageType("image/dicom", "a.dcm")).toBe(false);
    expect(isWebImageType("", "a.dcm")).toBe(false);
  });
});

describe("encodeRgbDicom", () => {
  it("produces a DICOM that parses back with the right image module", () => {
    const rows = 3;
    const columns = 4;
    const rgb = new Uint8Array(rows * columns * 3).map((_, i) => i % 256);

    const bytes = encodeRgbDicom(rgb, rows, columns);
    expect(hasDicomMagic(bytes)).toBe(true);

    const meta = OpDicomParser.parse(bytes).metadata();
    expect(meta.image.rows).toBe(rows);
    expect(meta.image.columns).toBe(columns);
    expect(meta.image.samplesPerPixel).toBe(3);
    expect(meta.image.photometricInterpretation).toBe("RGB");
    expect(meta.image.bitsAllocated).toBe(8);
    expect(meta.transferSyntaxUID).toBe("1.2.840.10008.1.2.1");
  });

  it("pads odd-length pixel data to an even length", () => {
    // 1x1 RGB = 3 bytes (odd) -> PixelData must be padded; still parseable.
    const bytes = encodeRgbDicom(new Uint8Array([10, 20, 30]), 1, 1);
    const meta = OpDicomParser.parse(bytes).metadata();
    expect(meta.image.rows).toBe(1);
    expect(meta.image.columns).toBe(1);
  });
});
