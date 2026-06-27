import { describe, expect, it } from "vitest";
import { PREFERRED_COLORMAPS, pickColormaps } from "../src/colormaps.js";

describe("pickColormaps", () => {
  it("keeps only available preferred colormaps, in preferred order", () => {
    const available = ["Jet", "Hot", "Grayscale", "Unrelated"];
    expect(pickColormaps(available)).toEqual(["Grayscale", "Hot", "Jet"]);
  });

  it("falls back to the first N registered when none preferred match", () => {
    const available = ["A", "B", "C", "D"];
    expect(pickColormaps(available, PREFERRED_COLORMAPS, 2)).toEqual(["A", "B"]);
  });

  it("returns an empty list for no input", () => {
    expect(pickColormaps([])).toEqual([]);
  });

  it("never invents a name not in the available set", () => {
    const available = ["Hot"];
    const result = pickColormaps(available);
    expect(result.every((n) => available.includes(n))).toBe(true);
  });
});
