import { describe, expect, it } from "vitest";
import {
  MANIPULATION_TOOLS,
  MEASUREMENT_TOOLS,
  TOOLS,
  cornerstoneToolName,
  getToolDescriptor,
  isMeasurementTool,
} from "../src/tools.js";

describe("tool descriptors", () => {
  it("maps every public id to a Cornerstone tool name", () => {
    expect(cornerstoneToolName("windowLevel")).toBe("WindowLevel");
    expect(cornerstoneToolName("scroll")).toBe("StackScroll");
    expect(cornerstoneToolName("length")).toBe("Length");
    expect(cornerstoneToolName("rectangleRoi")).toBe("RectangleROI");
    expect(cornerstoneToolName("ellipticalRoi")).toBe("EllipticalROI");
    expect(cornerstoneToolName("probe")).toBe("Probe");
    expect(cornerstoneToolName("angle")).toBe("Angle");
  });

  it("has unique ids and unique cornerstone names", () => {
    const ids = TOOLS.map((t) => t.id);
    const names = TOOLS.map((t) => t.cornerstoneName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("classifies manipulation vs measurement tools", () => {
    expect(isMeasurementTool("length")).toBe(true);
    expect(isMeasurementTool("windowLevel")).toBe(false);
    expect(MANIPULATION_TOOLS.map((t) => t.id)).toEqual([
      "windowLevel",
      "zoom",
      "pan",
      "scroll",
    ]);
    expect(MEASUREMENT_TOOLS.every((t) => t.category === "measurement")).toBe(true);
  });

  it("partitions all tools into the two categories", () => {
    expect(MANIPULATION_TOOLS.length + MEASUREMENT_TOOLS.length).toBe(TOOLS.length);
  });

  it("getToolDescriptor returns label + category", () => {
    const probe = getToolDescriptor("probe");
    expect(probe.label).toBe("Probe");
    expect(probe.category).toBe("measurement");
  });
});
