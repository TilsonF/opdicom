import { RenderingEngine } from "@cornerstonejs/core";
import { ensureInitialized } from "./init.js";

/** Opaque handle to a Cornerstone RenderingEngine shared across grid cells. */
export type SharedRenderingEngine = RenderingEngine;

let counter = 0;

/**
 * Create one RenderingEngine to be shared by every cell of a layout grid.
 * Cornerstone's context-pool engine is designed to host many viewports on a
 * single engine; using one shared engine (instead of one per cell) is what lets
 * 2x2+ grids render without exhausting the WebGL context pool.
 */
export async function createSharedRenderingEngine(): Promise<SharedRenderingEngine> {
  await ensureInitialized();
  return new RenderingEngine(`opdicom-shared-${++counter}`);
}
