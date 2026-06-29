import {
  Enums,
  RenderingEngine,
  imageLoader,
  setVolumesForViewports,
  volumeLoader,
  type Types,
} from "@cornerstonejs/core";
import {
  Enums as ToolEnums,
  PanTool,
  StackScrollTool,
  ToolGroupManager,
  WindowLevelTool,
  ZoomTool,
} from "@cornerstonejs/tools";
import { ensureInitialized } from "./init.js";
import { voiFromWindowLevel } from "./voi.js";

const PLANES = [
  { key: "axial", orientation: Enums.OrientationAxis.AXIAL },
  { key: "sagittal", orientation: Enums.OrientationAxis.SAGITTAL },
  { key: "coronal", orientation: Enums.OrientationAxis.CORONAL },
] as const;

export interface OpDicomMprOptions {
  id?: string;
  renderingEngine: RenderingEngine;
  background?: Types.Point3;
}

let mprCounter = 0;

/**
 * Multiplanar reconstruction: builds a volume from a stack of imageIds and
 * renders synchronized axial / sagittal / coronal viewports on a shared
 * RenderingEngine. Window-level, zoom, pan and slice scroll work in every plane.
 */
export class OpDicomMpr {
  readonly id: string;
  private readonly engine: RenderingEngine;
  private readonly background: Types.Point3;
  private readonly elements: HTMLDivElement[];
  private readonly viewportIds: string[];
  private readonly toolGroupId: string;
  private volumeId?: string;
  private destroyed = false;

  constructor(elements: HTMLDivElement[], options: OpDicomMprOptions) {
    this.elements = elements.slice(0, 3);
    this.engine = options.renderingEngine;
    this.background = options.background ?? [0, 0, 0];
    this.id = options.id ?? `opdicom-mpr-${++mprCounter}`;
    this.viewportIds = PLANES.map((p) => `${this.id}-${p.key}`);
    this.toolGroupId = `${this.id}-tg`;
  }

  /** Build a volume from imageIds and display the three orthogonal planes. */
  async load(imageIds: string[]): Promise<void> {
    await ensureInitialized();
    if (this.destroyed || this.elements.length < 3) return;

    this.volumeId = `opdicom-vol-${this.id}`;

    // Pre-load/parse every frame so per-image metadata (pixel + plane modules)
    // is registered before the volume is assembled — otherwise the volume
    // loader reads undefined metadata for local (dicomfile) images.
    await Promise.all(
      imageIds.map((imageId) => imageLoader.loadAndCacheImage(imageId)),
    );

    PLANES.forEach((plane, i) => {
      this.engine.enableElement({
        viewportId: this.viewportIds[i]!,
        type: Enums.ViewportType.ORTHOGRAPHIC,
        element: this.elements[i]!,
        defaultOptions: {
          orientation: plane.orientation,
          background: this.background,
        },
      });
    });

    // Images are cached above, so this builds the volume synchronously from
    // them (no streaming loader / scheme needed).
    const volume = await volumeLoader.createAndCacheVolumeFromImages(
      this.volumeId,
      imageIds,
    );

    await setVolumesForViewports(
      this.engine,
      [{ volumeId: this.volumeId }],
      this.viewportIds,
    );

    this.setupTools();
    this.engine.resize(true, true);
    void volume;

    // Center every plane on its middle slice (the default can land on an empty
    // edge slice). Run now and again next frame, since getNumberOfSlices() can
    // still be 0 synchronously right after the volume is set.
    this.centerPlanes();
    requestAnimationFrame(() => this.centerPlanes());
  }

  private centerPlanes(): void {
    this.viewportIds.forEach((id) => {
      const vp = this.engine.getViewport(id) as unknown as
        | {
            getNumberOfSlices?: () => number;
            getSliceIndex?: () => number;
            scroll?: (delta: number) => void;
            render: () => void;
          }
        | undefined;
      if (!vp) return;
      const count = vp.getNumberOfSlices?.() ?? 0;
      if (count > 0 && vp.scroll) {
        const current = vp.getSliceIndex?.() ?? 0;
        const delta = Math.floor(count / 2) - current;
        if (delta !== 0) vp.scroll(delta);
      }
      vp.render();
    });
  }

  private setupTools(): void {
    const existing = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (existing) ToolGroupManager.destroyToolGroup(this.toolGroupId);
    const tg = ToolGroupManager.createToolGroup(this.toolGroupId);
    if (!tg) return;

    for (const tool of [WindowLevelTool, PanTool, ZoomTool, StackScrollTool]) {
      tg.addTool(tool.toolName);
    }
    for (const id of this.viewportIds) tg.addViewport(id, this.engine.id);

    tg.setToolActive(WindowLevelTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
    });
    tg.setToolActive(ZoomTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
    });
    tg.setToolActive(PanTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
    });
    tg.setToolActive(StackScrollTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
    });
  }

  /** Apply a window/level to all planes. */
  setWindowLevel(center: number, width: number): void {
    const voiRange = voiFromWindowLevel(center, width);
    this.viewportIds.forEach((id) => {
      const vp = this.engine.getViewport(id) as Types.IVolumeViewport | undefined;
      vp?.setProperties({ voiRange });
      vp?.render();
    });
  }

  /** Apply a colormap to all planes. */
  setColormap(name: string): void {
    this.viewportIds.forEach((id) => {
      const vp = this.engine.getViewport(id) as Types.IVolumeViewport | undefined;
      vp?.setProperties({ colormap: { name } });
      vp?.render();
    });
  }

  reset(): void {
    this.viewportIds.forEach((id) => {
      const vp = this.engine.getViewport(id);
      vp?.resetCamera();
      vp?.render();
    });
  }

  resize(): void {
    this.engine.resize(true, true);
  }

  destroy(): void {
    this.destroyed = true;
    const tg = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (tg) ToolGroupManager.destroyToolGroup(this.toolGroupId);
    this.viewportIds.forEach((id) => {
      try {
        this.engine.disableElement(id);
      } catch {
        /* already gone */
      }
    });
  }
}
