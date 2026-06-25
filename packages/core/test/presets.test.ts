import { describe, expect, it } from "vitest";
import { WINDOW_PRESETS } from "../src/presets.js";

describe("WINDOW_PRESETS", () => {
  it("exposes the common CT presets", () => {
    expect(Object.keys(WINDOW_PRESETS)).toContain("CT Lung");
    expect(Object.keys(WINDOW_PRESETS)).toContain("CT Bone");
    expect(Object.keys(WINDOW_PRESETS)).toContain("CT Brain");
  });

  it("uses positive widths for every preset", () => {
    for (const [name, wl] of Object.entries(WINDOW_PRESETS)) {
      expect(wl.width, `${name} width`).toBeGreaterThan(0);
      expect(Number.isFinite(wl.center), `${name} center`).toBe(true);
    }
  });

  it("matches well-known radiology values", () => {
    expect(WINDOW_PRESETS["CT Lung"]).toEqual({ center: -600, width: 1500 });
    expect(WINDOW_PRESETS["CT Brain"]).toEqual({ center: 40, width: 80 });
  });
});
