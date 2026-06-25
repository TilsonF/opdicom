import dicomParser from "dicom-parser";
import { Tag } from "./tags.js";
import type {
  DicomMetadata,
  ImageInfo,
  PatientInfo,
  SeriesInfo,
  StudyInfo,
  WindowLevel,
} from "./types.js";

/** Narrowed view of the dicom-parser DataSet we rely on. */
export type DicomDataSet = dicomParser.DataSet;

function splitMultiValue(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\\")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * High-performance DICOM parser.
 *
 * Wraps the battle-tested `dicom-parser` byte reader with a typed, ergonomic
 * accessor layer and structured metadata extraction. Parsing is synchronous and
 * zero-copy over the input buffer — the heavy pixel data is *not* decoded here.
 */
export class OpDicomParser {
  readonly dataSet: DicomDataSet;
  private readonly byteArray: Uint8Array;

  private constructor(dataSet: DicomDataSet, byteArray: Uint8Array) {
    this.dataSet = dataSet;
    this.byteArray = byteArray;
  }

  /** Parse from an ArrayBuffer / typed array (browser File, fetch, fs, …). */
  static parse(
    input: ArrayBuffer | Uint8Array,
    options?: dicomParser.ParseDicomOptions,
  ): OpDicomParser {
    const bytes =
      input instanceof Uint8Array ? input : new Uint8Array(input);
    const dataSet = dicomParser.parseDicom(bytes, options);
    return new OpDicomParser(dataSet, bytes);
  }

  /** Async helper for a browser File/Blob. */
  static async parseFile(file: Blob): Promise<OpDicomParser> {
    const buffer = await file.arrayBuffer();
    return OpDicomParser.parse(buffer);
  }

  // ---- typed primitive accessors -------------------------------------------

  string(tag: string): string | undefined {
    return this.dataSet.string(tag);
  }

  int(tag: string, index = 0): number | undefined {
    const v = this.dataSet.intString(tag, index);
    return Number.isFinite(v) ? v : undefined;
  }

  float(tag: string, index = 0): number | undefined {
    const v = this.dataSet.floatString(tag, index);
    return Number.isFinite(v) ? v : undefined;
  }

  uint16(tag: string): number | undefined {
    return this.dataSet.uint16(tag);
  }

  /** Raw `(0028,1050)/(0028,1051)` window presets, possibly multi-valued. */
  windowLevels(): WindowLevel[] {
    const centers = splitMultiValue(this.string(Tag.WindowCenter));
    const widths = splitMultiValue(this.string(Tag.WindowWidth));
    const explanations = splitMultiValue(
      this.string(Tag.WindowCenterWidthExplanation),
    );
    const out: WindowLevel[] = [];
    const n = Math.min(centers.length, widths.length);
    for (let i = 0; i < n; i++) {
      const center = Number.parseFloat(centers[i]!);
      const width = Number.parseFloat(widths[i]!);
      if (Number.isFinite(center) && Number.isFinite(width)) {
        out.push({ center, width, explanation: explanations[i] });
      }
    }
    return out;
  }

  // ---- structured extraction -----------------------------------------------

  patient(): PatientInfo {
    return {
      name: this.string(Tag.PatientName),
      id: this.string(Tag.PatientID),
      birthDate: this.string(Tag.PatientBirthDate),
      sex: this.string(Tag.PatientSex),
    };
  }

  study(): StudyInfo {
    return {
      instanceUID: this.string(Tag.StudyInstanceUID),
      date: this.string(Tag.StudyDate),
      time: this.string(Tag.StudyTime),
      description: this.string(Tag.StudyDescription),
      accessionNumber: this.string(Tag.AccessionNumber),
    };
  }

  series(): SeriesInfo {
    return {
      instanceUID: this.string(Tag.SeriesInstanceUID),
      number: this.int(Tag.SeriesNumber),
      description: this.string(Tag.SeriesDescription),
      modality: this.string(Tag.Modality),
      bodyPart: this.string(Tag.BodyPartExamined),
    };
  }

  image(): ImageInfo {
    const spacing = splitMultiValue(this.string(Tag.PixelSpacing));
    const orientation = splitMultiValue(
      this.string(Tag.ImageOrientationPatient),
    ).map(Number.parseFloat);
    const position = splitMultiValue(this.string(Tag.ImagePositionPatient)).map(
      Number.parseFloat,
    );

    return {
      sopInstanceUID: this.string(Tag.SOPInstanceUID),
      instanceNumber: this.int(Tag.InstanceNumber),
      rows: this.uint16(Tag.Rows),
      columns: this.uint16(Tag.Columns),
      bitsAllocated: this.uint16(Tag.BitsAllocated),
      bitsStored: this.uint16(Tag.BitsStored),
      highBit: this.uint16(Tag.HighBit),
      pixelRepresentation: this.uint16(Tag.PixelRepresentation),
      samplesPerPixel: this.uint16(Tag.SamplesPerPixel),
      photometricInterpretation: this.string(Tag.PhotometricInterpretation),
      numberOfFrames: this.int(Tag.NumberOfFrames),
      rescaleSlope: this.float(Tag.RescaleSlope),
      rescaleIntercept: this.float(Tag.RescaleIntercept),
      rescaleType: this.string(Tag.RescaleType),
      pixelSpacing:
        spacing.length >= 2
          ? [Number.parseFloat(spacing[0]!), Number.parseFloat(spacing[1]!)]
          : undefined,
      sliceThickness: this.float(Tag.SliceThickness),
      sliceLocation: this.float(Tag.SliceLocation),
      imagePositionPatient:
        position.length >= 3
          ? [position[0]!, position[1]!, position[2]!]
          : undefined,
      imageOrientationPatient:
        orientation.length >= 6 ? orientation : undefined,
      windowLevels: this.windowLevels(),
    };
  }

  /** Full structured metadata for this instance. */
  metadata(): DicomMetadata {
    return {
      transferSyntaxUID: this.string(Tag.TransferSyntaxUID),
      patient: this.patient(),
      study: this.study(),
      series: this.series(),
      image: this.image(),
    };
  }
}

/** Convenience: parse a buffer and return structured metadata in one call. */
export function parseMetadata(
  input: ArrayBuffer | Uint8Array,
): DicomMetadata {
  return OpDicomParser.parse(input).metadata();
}
