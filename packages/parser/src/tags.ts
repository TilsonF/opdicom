/**
 * Common DICOM tags in dicom-parser's `xGGGGEEEE` (lower-case hex) form.
 * Group/element, e.g. (0010,0010) -> "x00100010".
 */
export const Tag = {
  // Patient
  PatientName: "x00100010",
  PatientID: "x00100020",
  PatientBirthDate: "x00100030",
  PatientSex: "x00100040",

  // Study
  StudyInstanceUID: "x0020000d",
  StudyDate: "x00080020",
  StudyTime: "x00080030",
  StudyDescription: "x00081030",
  AccessionNumber: "x00080050",

  // Series
  SeriesInstanceUID: "x0020000e",
  SeriesNumber: "x00200011",
  SeriesDescription: "x0008103e",
  Modality: "x00080060",
  BodyPartExamined: "x00180015",

  // Instance / image
  SOPInstanceUID: "x00080018",
  SOPClassUID: "x00080016",
  InstanceNumber: "x00200013",
  Rows: "x00280010",
  Columns: "x00280011",
  BitsAllocated: "x00280100",
  BitsStored: "x00280101",
  HighBit: "x00280102",
  PixelRepresentation: "x00280103",
  SamplesPerPixel: "x00280002",
  PhotometricInterpretation: "x00280004",
  NumberOfFrames: "x00280008",
  PlanarConfiguration: "x00280006",

  // Pixel value transform
  RescaleIntercept: "x00281052",
  RescaleSlope: "x00281053",
  RescaleType: "x00281054",
  WindowCenter: "x00281050",
  WindowWidth: "x00281051",
  WindowCenterWidthExplanation: "x00281055",

  // Geometry
  PixelSpacing: "x00280030",
  ImagerPixelSpacing: "x00181164",
  SliceThickness: "x00180050",
  SliceLocation: "x00201041",
  ImagePositionPatient: "x00200032",
  ImageOrientationPatient: "x00200037",

  // Pixel data
  PixelData: "x7fe00010",

  // Meta header
  TransferSyntaxUID: "x00020010",
  MediaStorageSOPClassUID: "x00020002",
} as const;

export type TagName = keyof typeof Tag;
