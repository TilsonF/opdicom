import { describe, expect, it } from "vitest";
import { LAYOUTS, layoutDims, resolveLayout } from "../src/layout.js";

describe("layoutDims", () => {
  it("returns cols/rows/cells per layout", () => {
    expect(layoutDims("1x1")).toEqual({ cols: 1, rows: 1, cells: 1 });
    expect(layoutDims("2x1")).toEqual({ cols: 2, rows: 1, cells: 2 });
    expect(layoutDims("2x2")).toEqual({ cols: 2, rows: 2, cells: 4 });
  });

  it("cells equals cols * rows for every layout", () => {
    for (const name of LAYOUTS) {
      const d = layoutDims(name);
      expect(d.cells).toBe(d.cols * d.rows);
    }
  });

  it("offers 2x2 (shared rendering engine makes it safe)", () => {
    expect(LAYOUTS).toContain("2x2");
    expect(LAYOUTS).toEqual(["1x1", "2x1", "1x2", "2x2"]);
  });

  it("falls back to 1x1 for unknown names", () => {
    expect(layoutDims("9x9")).toEqual({ cols: 1, rows: 1, cells: 1 });
  });
});

describe("resolveLayout", () => {
  it("passes through valid layouts and defaults the rest", () => {
    expect(resolveLayout("2x2")).toBe("2x2");
    expect(resolveLayout("nope")).toBe("1x1");
    expect(resolveLayout(undefined)).toBe("1x1");
  });
});
