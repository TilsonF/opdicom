import { describe, expect, it } from "vitest";
import {
  DEFAULT_FPS,
  MAX_FPS,
  MIN_FPS,
  normalizeCineOptions,
} from "../src/cine.js";

describe("normalizeCineOptions", () => {
  it("applies sane defaults", () => {
    expect(normalizeCineOptions()).toEqual({
      framesPerSecond: DEFAULT_FPS,
      loop: true,
      reverse: false,
    });
  });

  it("rounds and clamps the frame rate to [MIN_FPS, MAX_FPS]", () => {
    expect(normalizeCineOptions({ fps: 30 }).framesPerSecond).toBe(30);
    expect(normalizeCineOptions({ fps: 0 }).framesPerSecond).toBe(MIN_FPS);
    expect(normalizeCineOptions({ fps: -5 }).framesPerSecond).toBe(MIN_FPS);
    expect(normalizeCineOptions({ fps: 999 }).framesPerSecond).toBe(MAX_FPS);
    expect(normalizeCineOptions({ fps: 23.7 }).framesPerSecond).toBe(24);
  });

  it("falls back to the default on non-finite fps", () => {
    expect(normalizeCineOptions({ fps: Number.NaN }).framesPerSecond).toBe(DEFAULT_FPS);
    expect(
      normalizeCineOptions({ fps: Number.POSITIVE_INFINITY }).framesPerSecond,
    ).toBe(DEFAULT_FPS);
  });

  it("passes through loop and reverse", () => {
    expect(normalizeCineOptions({ loop: false, reverse: true })).toEqual({
      framesPerSecond: DEFAULT_FPS,
      loop: false,
      reverse: true,
    });
  });
});
