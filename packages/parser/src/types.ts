/** Multi-valued window/level setting from (0028,1050)/(0028,1051). */
export interface WindowLevel {
  center: number;
  width: number;
  explanation?: string;
}

/** High-level patient identity. */
export interface PatientInfo {
  name?: string;
  id?: string;
  birthDate?: string;
  sex?: string;
}

/** High-level study identity. */
export interface StudyInfo {
  instanceUID?: string;
  date?: string;
  time?: string;
  description?: string;
  accessionNumber?: string;
}

/** High-level series identity. */
export interface SeriesInfo {
  instanceUID?: string;
  number?: number;
  description?: string;
  modality?: string;
  bodyPart?: string;
}

/**
 * Decoded image-pixel description plus the value transform required to read
 * meaningful (e.g. Hounsfield) values. Getting these wrong is a safety issue,
 * so they are surfaced explicitly.
 */
export interface ImageInfo {
  sopInstanceUID?: string;
  instanceNumber?: number;
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  /** 0 = unsigned, 1 = signed (two's complement). */
  pixelRepresentation?: number;
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  numberOfFrames?: number;
  /** Modality LUT: storedValue * slope + intercept = output (e.g. HU). */
  rescaleSlope?: number;
  rescaleIntercept?: number;
  rescaleType?: string;
  /** [row spacing, column spacing] in mm. */
  pixelSpacing?: [number, number];
  sliceThickness?: number;
  sliceLocation?: number;
  imagePositionPatient?: [number, number, number];
  imageOrientationPatient?: number[];
  /** All window/level presets stored in the file. */
  windowLevels: WindowLevel[];
}

/** Everything OpDICOM extracts from one DICOM instance. */
export interface DicomMetadata {
  transferSyntaxUID?: string;
  patient: PatientInfo;
  study: StudyInfo;
  series: SeriesInfo;
  image: ImageInfo;
}
