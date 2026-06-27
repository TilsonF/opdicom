/**
 * Pure geometry helpers for mapping a world (patient) coordinate to an image
 * column/row and sampling the pixel value. Kept dependency-free and unit-tested
 * so the cursor readout is provably correct for the common (axis-aligned) case.
 */

export type Vec3 = [number, number, number];

/** Image geometry as exposed by Cornerstone's `IImageData`. */
export interface ImageGeometry {
  origin: Vec3;
  spacing: Vec3;
  /** Row-major 3x3 (length 9): columns 0/1 are the i/j axis unit vectors. */
  direction: number[];
  /** [columns, rows, frames]. */
  dimensions: Vec3;
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Map a world coordinate to integer image (column i, row j) indices by
 * projecting the offset-from-origin onto the in-plane axis vectors. Correct for
 * axis-aligned and rotated single-slice frames; oblique reslices are out of
 * scope here.
 */
export function worldToIJK(world: Vec3, geom: ImageGeometry): [number, number] {
  const d: Vec3 = [
    world[0] - geom.origin[0],
    world[1] - geom.origin[1],
    world[2] - geom.origin[2],
  ];
  const iAxis: Vec3 = [geom.direction[0]!, geom.direction[1]!, geom.direction[2]!];
  const jAxis: Vec3 = [geom.direction[3]!, geom.direction[4]!, geom.direction[5]!];
  const sx = geom.spacing[0] || 1;
  const sy = geom.spacing[1] || 1;
  return [Math.round(dot(d, iAxis) / sx), Math.round(dot(d, jAxis) / sy)];
}

/** Whether (i, j) is inside the image grid. */
export function isInBounds(
  i: number,
  j: number,
  dimensions: Vec3,
): boolean {
  return i >= 0 && j >= 0 && i < dimensions[0] && j < dimensions[1];
}

/**
 * Sample a single-frame scalar buffer at (i, j). Returns undefined if out of
 * bounds so callers can show a blank rather than a misleading value.
 */
export function sampleValue(
  scalarData: ArrayLike<number>,
  dimensions: Vec3,
  i: number,
  j: number,
): number | undefined {
  if (!isInBounds(i, j, dimensions)) return undefined;
  return scalarData[j * dimensions[0] + i];
}
