/** A Cornerstone VOI range (Values Of Interest) in output units. */
export interface VoiRange {
  lower: number;
  upper: number;
}

/**
 * Convert a window center/width (the DICOM/radiology convention) into the
 * lower/upper VOI range Cornerstone expects.
 *
 * Defined per DICOM PS3.3 C.11.2.1.2: a width <= 0 is invalid; we clamp to a
 * minimum width of 1 so a degenerate preset can never collapse the range or
 * invert it (a correctness/safety concern for displayed pixel values).
 */
export function voiFromWindowLevel(center: number, width: number): VoiRange {
  if (!Number.isFinite(center) || !Number.isFinite(width)) {
    throw new RangeError("window center/width must be finite numbers");
  }
  const safeWidth = Math.max(width, 1);
  return {
    lower: center - safeWidth / 2,
    upper: center + safeWidth / 2,
  };
}

/** Inverse of {@link voiFromWindowLevel}. */
export function windowLevelFromVoi(range: VoiRange): {
  center: number;
  width: number;
} {
  return {
    center: (range.upper + range.lower) / 2,
    width: range.upper - range.lower,
  };
}
