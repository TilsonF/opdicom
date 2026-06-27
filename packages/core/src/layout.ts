/** Viewer grid layouts (pure, dependency-free). */

export type LayoutName = "1x1" | "2x1" | "1x2" | "2x2";

/**
 * Layouts offered in the UI. 2x2+ is intentionally excluded: each cell is its
 * own Cornerstone RenderingEngine, and four exhaust the shared WebGL context
 * pool in software renderers. Larger grids need a single-engine/multi-viewport
 * refactor (tracked with MPR). "2x2" stays a valid LayoutName for that future.
 */
export const LAYOUTS: readonly LayoutName[] = ["1x1", "2x1", "1x2"];

export interface LayoutDims {
  cols: number;
  rows: number;
  cells: number;
}

const TABLE: Record<LayoutName, LayoutDims> = {
  "1x1": { cols: 1, rows: 1, cells: 1 },
  "2x1": { cols: 2, rows: 1, cells: 2 },
  "1x2": { cols: 1, rows: 2, cells: 2 },
  "2x2": { cols: 2, rows: 2, cells: 4 },
};

/** Columns/rows/cell-count for a layout (falls back to 1x1 if unknown). */
export function layoutDims(name: string): LayoutDims {
  return TABLE[name as LayoutName] ?? TABLE["1x1"];
}

/** Normalize an arbitrary string to a valid LayoutName. */
export function resolveLayout(name: string | undefined | null): LayoutName {
  return name && name in TABLE ? (name as LayoutName) : "1x1";
}
