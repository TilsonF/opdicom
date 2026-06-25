import { describe, expect, it } from "vitest";
import { OpDicomParser, Tag, parseMetadata } from "../src/index.js";
import { makeDicom } from "./dicom-fixture.js";

describe("OpDicomParser", () => {
  it("parses a valid DICOM Part-10 buffer", () => {
    const parser = OpDicomParser.parse(makeDicom());
    expect(parser.dataSet).toBeDefined();
    expect(parser.string(Tag.Modality)).toBe("CT");
  });

  it("extracts patient / study / series info", () => {
    const meta = parseMetadata(makeDicom({ patientName: "SMITH^JANE", patientId: "P-42" }));
    expect(meta.patient.name).toBe("SMITH^JANE");
    expect(meta.patient.id).toBe("P-42");
    expect(meta.series.modality).toBe("CT");
    expect(meta.study.instanceUID).toBeDefined();
    expect(meta.series.instanceUID).toBeDefined();
  });

  it("reads image geometry (rows/columns as US, pixel spacing as DS pair)", () => {
    const meta = parseMetadata(makeDicom({ rows: 512, columns: 384, pixelSpacing: "0.75\\0.85" }));
    expect(meta.image.rows).toBe(512);
    expect(meta.image.columns).toBe(384);
    expect(meta.image.pixelSpacing).toEqual([0.75, 0.85]);
  });

  it("parses multi-valued window center / width into separate presets", () => {
    const meta = parseMetadata(makeDicom({ windowCenter: "40\\-600", windowWidth: "400\\1500" }));
    expect(meta.image.windowLevels).toEqual([
      { center: 40, width: 400, explanation: undefined },
      { center: -600, width: 1500, explanation: undefined },
    ]);
  });

  it("parses the modality rescale transform (slope/intercept)", () => {
    const meta = parseMetadata(makeDicom({ rescaleSlope: "1", rescaleIntercept: "-1024" }));
    expect(meta.image.rescaleSlope).toBe(1);
    expect(meta.image.rescaleIntercept).toBe(-1024);
  });

  it("reports the transfer syntax UID", () => {
    const meta = parseMetadata(makeDicom());
    expect(meta.transferSyntaxUID).toBe("1.2.840.10008.1.2.1");
  });

  it("surfaces the signed/unsigned pixel representation", () => {
    expect(parseMetadata(makeDicom({ pixelRepresentation: 0 })).image.pixelRepresentation).toBe(0);
    expect(parseMetadata(makeDicom({ pixelRepresentation: 1 })).image.pixelRepresentation).toBe(1);
  });

  it("throws on a non-DICOM buffer", () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(() => OpDicomParser.parse(garbage)).toThrow();
  });

  it("accepts an ArrayBuffer as well as a Uint8Array", () => {
    const u8 = makeDicom();
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    expect(parseMetadata(ab).series.modality).toBe("CT");
  });

  it("parseFile reads from a Blob", async () => {
    const blob = new Blob([makeDicom() as BlobPart]);
    const parser = await OpDicomParser.parseFile(blob);
    expect(parser.metadata().series.modality).toBe("CT");
  });

  it("returns empty window levels when widths are missing", () => {
    const meta = parseMetadata(makeDicom({ windowCenter: "", windowWidth: "" }));
    expect(meta.image.windowLevels).toEqual([]);
  });
});
