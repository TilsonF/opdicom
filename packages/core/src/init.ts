import {
  init as coreInit,
  cornerstoneStreamingImageVolumeLoader,
  utilities as csUtilities,
  volumeLoader,
} from "@cornerstonejs/core";
import { BUILTIN_COLORMAPS } from "./colormaps.js";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import {
  init as toolsInit,
  addTool,
  AngleTool,
  ArrowAnnotateTool,
  BidirectionalTool,
  CircleROITool,
  CobbAngleTool,
  EllipticalROITool,
  LengthTool,
  PanTool,
  PlanarFreehandROITool,
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
      // Use the classic (legacy) metadata provider + loaders. In v5.0.13 the
      // new naturalized-metadata path for dicomfile/wadors is unstable (hangs
      // in addDicomPart10Instance); the legacy loaders are the proven path and
      // also drive the wadors metaDataManager our DICOMweb support populates.
      dicomImageLoaderInit({ useLegacyMetadataProvider: true });
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

      // Drawing / freehand annotation tools.
      addTool(PlanarFreehandROITool);
      addTool(ArrowAnnotateTool);
      addTool(CircleROITool);
      addTool(BidirectionalTool);
      addTool(CobbAngleTool);

      // Volume support (MPR): register the streaming image-volume loader so a
      // volume can be built from a stack of imageIds.
      volumeLoader.registerUnknownVolumeLoader(
        cornerstoneStreamingImageVolumeLoader as never,
      );
      volumeLoader.registerVolumeLoader(
        "cornerstoneStreamingImageVolume",
        cornerstoneStreamingImageVolumeLoader as never,
      );

      // The default colormap registry is empty in v5; register our built-ins.
      for (const cmap of BUILTIN_COLORMAPS) {
        try {
          csUtilities.colormap.registerColormap(cmap);
        } catch {
          /* ignore duplicate / unsupported registrations */
        }
      }
    })();
  }
  return initPromise;
}
