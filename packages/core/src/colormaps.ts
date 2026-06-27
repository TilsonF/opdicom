/**
 * Colormap selection helpers. Cornerstone exposes the actual registered
 * colormap names at runtime (`utilities.colormap.getColormapNames`); this module
 * only curates that list down to a friendly subset, never inventing names.
 */

/** A colormap definition in Cornerstone/vtk `registerColormap` form. */
export interface ColormapDef {
  Name: string;
  ColorSpace: string;
  /** Flat [scalar, r, g, b, …] with scalar and r/g/b in 0..1. */
  RGBPoints: number[];
}

/**
 * Built-in colormaps OpDICOM registers at init. The default Cornerstone v5
 * registry is empty, so we ship a small, correct, widely-used set rather than
 * leave the picker blank.
 */
export const BUILTIN_COLORMAPS: readonly ColormapDef[] = [
  { Name: "Grayscale", ColorSpace: "RGB", RGBPoints: [0, 0, 0, 0, 1, 1, 1, 1] },
  {
    Name: "Hot",
    ColorSpace: "RGB",
    RGBPoints: [0, 0, 0, 0, 0.33, 1, 0, 0, 0.66, 1, 1, 0, 1, 1, 1, 1],
  },
  {
    Name: "Jet",
    ColorSpace: "RGB",
    RGBPoints: [
      0, 0, 0, 0.5, 0.125, 0, 0, 1, 0.375, 0, 1, 1, 0.625, 1, 1, 0, 0.875, 1, 0,
      0, 1, 0.5, 0, 0,
    ],
  },
  {
    Name: "Cool to Warm",
    ColorSpace: "RGB",
    RGBPoints: [0, 0.23, 0.3, 0.75, 0.5, 0.86, 0.86, 0.86, 1, 0.7, 0.02, 0.15],
  },
  {
    Name: "Rainbow",
    ColorSpace: "RGB",
    RGBPoints: [
      0, 0, 0, 1, 0.25, 0, 1, 1, 0.5, 0, 1, 0, 0.75, 1, 1, 0, 1, 1, 0, 0,
    ],
  },
];

/** Preferred colormaps to surface first, in display order, when available. */
export const PREFERRED_COLORMAPS: readonly string[] = [
  "Grayscale",
  "Hot",
  "Jet",
  "Cool to Warm",
  "Rainbow",
  "X Ray",
  "Inferno (matplotlib)",
  "Viridis (matplotlib)",
  "hsv",
];

/**
 * Choose which colormaps to offer: the preferred ones that actually exist (in
 * preferred order); if none match, fall back to the first `max` registered.
 */
export function pickColormaps(
  available: readonly string[],
  preferred: readonly string[] = PREFERRED_COLORMAPS,
  max = 10,
): string[] {
  const set = new Set(available);
  const chosen = preferred.filter((name) => set.has(name));
  return chosen.length > 0 ? chosen : available.slice(0, max);
}
