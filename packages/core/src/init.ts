import { init as coreInit } from "@cornerstonejs/core";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import {
  init as toolsInit,
  addTool,
  AngleTool,
  EllipticalROITool,
  LengthTool,
  PanTool,
  ProbeTool,
  RectangleROITool,
  StackScrollTool,
  WindowLevelTool,
  ZoomTool,
} from "@cornerstonejs/tools";

let initPromise: Promise<void> | undefined;

/**
 * Initialize the Cornerstone3D core, the DICOM image loader (web workers +
 * WASM codecs) and the tools library — exactly once per page. Safe to call
 * repeatedly; concurrent callers share the same promise.
 */
export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await coreInit();
      dicomImageLoaderInit();
      await toolsInit();

      // Manipulation tools.
      addTool(WindowLevelTool);
      addTool(PanTool);
      addTool(ZoomTool);
      addTool(StackScrollTool);

      // Measurement / annotation tools.
      addTool(LengthTool);
      addTool(AngleTool);
      addTool(RectangleROITool);
      addTool(EllipticalROITool);
      addTool(ProbeTool);
    })();
  }
  return initPromise;
}
