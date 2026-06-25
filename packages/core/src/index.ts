export { OpDicomEngine } from "./engine.js";
export type {
  OpDicomEngineOptions,
  OpDicomTool,
  LoadResult,
} from "./engine.js";
export { ensureInitialized } from "./init.js";
export {
  TOOLS,
  MANIPULATION_TOOLS,
  MEASUREMENT_TOOLS,
  getToolDescriptor,
  cornerstoneToolName,
  isMeasurementTool,
} from "./tools.js";
export type { ToolDescriptor, ToolCategory } from "./tools.js";
export { WINDOW_PRESETS } from "./presets.js";
export type { WindowPresetName } from "./presets.js";
export { voiFromWindowLevel, windowLevelFromVoi } from "./voi.js";
export type { VoiRange } from "./voi.js";
export {
  normalizeCineOptions,
  DEFAULT_FPS,
  MIN_FPS,
  MAX_FPS,
} from "./cine.js";
export type { CineOptions, NormalizedCine } from "./cine.js";

// Re-export the parser surface so consumers get metadata types from one place.
export {
  OpDicomParser,
  parseMetadata,
  Tag,
} from "@opdicom/parser";
export type {
  DicomMetadata,
  ImageInfo,
  PatientInfo,
  SeriesInfo,
  StudyInfo,
  WindowLevel,
} from "@opdicom/parser";
