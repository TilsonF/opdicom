import type { WindowLevel } from "@opdicom/parser";

/**
 * Common radiology window/level presets in Hounsfield units. These are standard
 * starting points for CT review; the values are widely published and not
 * patient-specific.
 */
export const WINDOW_PRESETS: Record<string, WindowLevel> = {
  "CT Soft Tissue": { center: 40, width: 400 },
  "CT Lung": { center: -600, width: 1500 },
  "CT Bone": { center: 480, width: 2500 },
  "CT Brain": { center: 40, width: 80 },
  "CT Abdomen": { center: 60, width: 400 },
  "CT Liver": { center: 90, width: 150 },
  "CT Mediastinum": { center: 50, width: 350 },
  "CT Angio": { center: 300, width: 600 },
};

export type WindowPresetName = keyof typeof WINDOW_PRESETS;
