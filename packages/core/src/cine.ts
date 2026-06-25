/** Options for cine (movie) playback of a multi-image series. */
export interface CineOptions {
  /** Target frames per second. Clamped to [MIN_FPS, MAX_FPS]. */
  fps?: number;
  /** Loop back to the start at the end of the series. Default true. */
  loop?: boolean;
  /** Play the series in reverse. Default false. */
  reverse?: boolean;
}

/** Fully-resolved cine options passed to the rendering engine. */
export interface NormalizedCine {
  framesPerSecond: number;
  loop: boolean;
  reverse: boolean;
}

export const DEFAULT_FPS = 24;
export const MIN_FPS = 1;
export const MAX_FPS = 60;

/**
 * Validate and fill in cine options. Frame rate is rounded and clamped to a
 * sane range; non-finite input falls back to the default so playback can never
 * be driven with a zero/negative/NaN interval.
 */
export function normalizeCineOptions(options: CineOptions = {}): NormalizedCine {
  const requested = options.fps ?? DEFAULT_FPS;
  const framesPerSecond = Number.isFinite(requested)
    ? Math.min(Math.max(Math.round(requested), MIN_FPS), MAX_FPS)
    : DEFAULT_FPS;
  return {
    framesPerSecond,
    loop: options.loop ?? true,
    reverse: options.reverse ?? false,
  };
}
