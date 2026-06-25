import { describe, expect, it } from "vitest";
import { voiFromWindowLevel, windowLevelFromVoi } from "../src/voi.js";

describe("voiFromWindowLevel", () => {
  it("converts a standard CT soft-tissue window", () => {
    expect(voiFromWindowLevel(40, 400)).toEqual({ lower: -160, upper: 240 });
  });

  it("handles negative centers (e.g. lung window)", () => {
    expect(voiFromWindowLevel(-600, 1500)).toEqual({ lower: -1350, upper: 150 });
  });

  it("clamps non-positive widths to a minimum of 1 (never inverts the range)", () => {
    const r = voiFromWindowLevel(100, 0);
    expect(r.upper).toBeGreaterThan(r.lower);
    expect(voiFromWindowLevel(100, -50).upper).toBeGreaterThan(
      voiFromWindowLevel(100, -50).lower,
    );
  });

  it("throws on non-finite input", () => {
    expect(() => voiFromWindowLevel(Number.NaN, 100)).toThrow(RangeError);
    expect(() => voiFromWindowLevel(40, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("round-trips with windowLevelFromVoi", () => {
    const wl = { center: 50, width: 350 };
    const back = windowLevelFromVoi(voiFromWindowLevel(wl.center, wl.width));
    expect(back).toEqual(wl);
  });
});
