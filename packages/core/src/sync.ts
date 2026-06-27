import { SynchronizerManager, synchronizers } from "@cornerstonejs/tools";
import type { OpDicomEngine } from "./engine.js";

let counter = 0;

/**
 * Wire a set of viewports together so zoom/pan, window-level and stack scroll
 * stay in sync — used for multi-cell layouts. Returns a teardown function.
 * A single viewport needs no synchronization.
 */
export function createViewportSync(engines: OpDicomEngine[]): () => void {
  if (engines.length < 2) return () => {};

  const base = `opdicom-sync-${++counter}`;
  const names = [`${base}-zoompan`, `${base}-voi`, `${base}-slice`];
  const zoomPan = synchronizers.createZoomPanSynchronizer(names[0]!);
  const voi = synchronizers.createVOISynchronizer(names[1]!, {
    syncInvertState: true,
    syncColormap: true,
  });
  const slice = synchronizers.createStackImageSynchronizer(names[2]!);

  for (const engine of engines) {
    const ref = engine.viewportRef;
    zoomPan.add(ref);
    voi.add(ref);
    slice.add(ref);
  }

  return () => {
    for (const name of names) {
      try {
        SynchronizerManager.destroySynchronizer(name);
      } catch {
        /* already gone */
      }
    }
  };
}
