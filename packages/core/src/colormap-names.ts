import { utilities } from "@cornerstonejs/core";

/** Names of the colormaps currently registered with Cornerstone. */
export function getColormapNames(): string[] {
  try {
    return (utilities.colormap.getColormapNames() as string[]) ?? [];
  } catch {
    return [];
  }
}
