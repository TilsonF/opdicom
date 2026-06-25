export { OpdicomViewer } from "./opdicom-viewer.js";

// Re-export useful types/utilities so integrators import from one place.
export {
  OpDicomEngine,
  WINDOW_PRESETS,
  type DicomMetadata,
  type LoadResult,
  type OpDicomTool,
} from "@opdicom/core";
