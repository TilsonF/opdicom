import { describe, expect, it } from "vitest";
import {
  isInBounds,
  sampleValue,
  worldToIJK,
  type ImageGeometry,
} from "../src/geometry.js";

const axial: ImageGeometry = {
  origin: [0, 0, 0],
  spacing: [1, 1, 1],
  direction: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  dimensions: [4, 4, 1],
};

describe("worldToIJK", () => {
  it("maps world to image indices for an identity-direction frame", () => {
    expect(worldToIJK([0, 0, 0], axial)).toEqual([0, 0]);
    expect(worldToIJK([2, 3, 0], axial)).toEqual([2, 3]);
  });

  it("accounts for origin and spacing", () => {
    const geom: ImageGeometry = {
      origin: [10, 20, 0],
      spacing: [2, 0.5, 1],
      direction: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      dimensions: [256, 256, 1],
    };
    expect(worldToIJK([14, 21, 0], geom)).toEqual([2, 2]);
  });

  it("rounds to the nearest voxel", () => {
    expect(worldToIJK([1.4, 1.6, 0], axial)).toEqual([1, 2]);
  });

  it("handles a rotated (swapped axes) frame", () => {
    const geom: ImageGeometry = {
      origin: [0, 0, 0],
      spacing: [1, 1, 1],
      // i-axis = +Y, j-axis = +X (90° rotation).
      direction: [0, 1, 0, 1, 0, 0, 0, 0, 1],
      dimensions: [4, 4, 1],
    };
    expect(worldToIJK([3, 1, 0], geom)).toEqual([1, 3]);
  });
});

describe("isInBounds", () => {
  it("checks the grid extents", () => {
    expect(isInBounds(0, 0, [4, 4, 1])).toBe(true);
    expect(isInBounds(3, 3, [4, 4, 1])).toBe(true);
    expect(isInBounds(-1, 0, [4, 4, 1])).toBe(false);
    expect(isInBounds(4, 0, [4, 4, 1])).toBe(false);
    expect(isInBounds(0, 4, [4, 4, 1])).toBe(false);
  });
});

describe("sampleValue", () => {
  const data = [0, 1, 2, 3, 10, 11, 12, 13, 20, 21, 22, 23];
  const dims: [number, number, number] = [4, 3, 1];

  it("reads row-major values", () => {
    expect(sampleValue(data, dims, 0, 0)).toBe(0);
    expect(sampleValue(data, dims, 3, 0)).toBe(3);
    expect(sampleValue(data, dims, 1, 2)).toBe(21);
  });

  it("returns undefined out of bounds", () => {
    expect(sampleValue(data, dims, 4, 0)).toBeUndefined();
    expect(sampleValue(data, dims, 0, 3)).toBeUndefined();
    expect(sampleValue(data, dims, -1, 0)).toBeUndefined();
  });
});
