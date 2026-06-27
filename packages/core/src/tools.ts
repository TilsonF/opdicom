/**
 * Pure, dependency-free descriptors for the tools OpDICOM exposes. The
 * `cornerstoneName` values are the literal `Tool.toolName` statics from
 * @cornerstonejs/tools v5 — kept here as plain strings so this module (and the
 * UI) can be unit-tested without importing the rendering engine.
 */

export type ToolCategory = "manipulation" | "measurement" | "draw";

/** Stable public ids used by the engine/Web Component API. */
export type OpDicomTool =
  | "windowLevel"
  | "pan"
  | "zoom"
  | "scroll"
  | "length"
  | "angle"
  | "rectangleRoi"
  | "ellipticalRoi"
  | "probe"
  | "freehand"
  | "arrow"
  | "circleRoi"
  | "bidirectional"
  | "cobbAngle";

export interface ToolDescriptor {
  id: OpDicomTool;
  /** Cornerstone3D `Tool.toolName` (verified against v5.0.13). */
  cornerstoneName: string;
  label: string;
  category: ToolCategory;
}

export const TOOLS: readonly ToolDescriptor[] = [
  { id: "windowLevel", cornerstoneName: "WindowLevel", label: "W/L", category: "manipulation" },
  { id: "zoom", cornerstoneName: "Zoom", label: "Zoom", category: "manipulation" },
  { id: "pan", cornerstoneName: "Pan", label: "Pan", category: "manipulation" },
  { id: "scroll", cornerstoneName: "StackScroll", label: "Scroll", category: "manipulation" },
  { id: "length", cornerstoneName: "Length", label: "Length", category: "measurement" },
  { id: "angle", cornerstoneName: "Angle", label: "Angle", category: "measurement" },
  { id: "rectangleRoi", cornerstoneName: "RectangleROI", label: "Rect ROI", category: "measurement" },
  { id: "ellipticalRoi", cornerstoneName: "EllipticalROI", label: "Ellipse ROI", category: "measurement" },
  { id: "probe", cornerstoneName: "Probe", label: "Probe", category: "measurement" },
  { id: "freehand", cornerstoneName: "PlanarFreehandROI", label: "Freehand", category: "draw" },
  { id: "arrow", cornerstoneName: "ArrowAnnotate", label: "Arrow", category: "draw" },
  { id: "circleRoi", cornerstoneName: "CircleROI", label: "Circle ROI", category: "draw" },
  { id: "bidirectional", cornerstoneName: "Bidirectional", label: "Bidirectional", category: "draw" },
  { id: "cobbAngle", cornerstoneName: "CobbAngle", label: "Cobb Angle", category: "draw" },
] as const;

const BY_ID: Record<OpDicomTool, ToolDescriptor> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<OpDicomTool, ToolDescriptor>;

/** Look up a descriptor by its public id. */
export function getToolDescriptor(id: OpDicomTool): ToolDescriptor {
  return BY_ID[id];
}

/** Cornerstone `toolName` for a public id. */
export function cornerstoneToolName(id: OpDicomTool): string {
  return BY_ID[id].cornerstoneName;
}

export function isMeasurementTool(id: OpDicomTool): boolean {
  return BY_ID[id].category === "measurement";
}

export const MANIPULATION_TOOLS = TOOLS.filter((t) => t.category === "manipulation");
export const MEASUREMENT_TOOLS = TOOLS.filter((t) => t.category === "measurement");
export const DRAW_TOOLS = TOOLS.filter((t) => t.category === "draw");
