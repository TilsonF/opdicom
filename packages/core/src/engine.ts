import {
  Enums,
  RenderingEngine,
  type Types,
} from "@cornerstonejs/core";
import { wadouri } from "@cornerstonejs/dicom-image-loader";
import {
  Enums as ToolEnums,
  PanTool,
  StackScrollTool,
  ToolGroupManager,
  WindowLevelTool,
  ZoomTool,
} from "@cornerstonejs/tools";
import { OpDicomParser, type DicomMetadata } from "@opdicom/parser";
import { ensureInitialized } from "./init.js";
import { voiFromWindowLevel } from "./voi.js";

/** Manipulation tools OpDICOM binds to the primary mouse / touch interaction. */
export type OpDicomTool = "windowLevel" | "pan" | "zoom" | "scroll";

const TOOL_NAME: Record<OpDicomTool, string> = {
  windowLevel: WindowLevelTool.toolName,
  pan: PanTool.toolName,
  zoom: ZoomTool.toolName,
  scroll: StackScrollTool.toolName,
};

export interface OpDicomEngineOptions {
  /** Unique id; auto-derived when omitted. Useful for multiple viewers. */
  id?: string;
  /** Background color as [r, g, b] in 0..1. Defaults to black. */
  background?: Types.Point3;
}

export interface LoadResult {
  imageIds: string[];
  metadata: DicomMetadata[];
}

let instanceCounter = 0;

/**
 * Headless, framework-agnostic DICOM viewer engine. Owns one Cornerstone3D
 * rendering engine bound to a single DOM element and a stack viewport, plus a
 * tool group wired for pan/zoom/window-level/scroll. UI layers (the Web
 * Component, React wrappers, …) drive this class; it has no framework deps.
 */
export class OpDicomEngine {
  readonly id: string;
  private readonly viewportId: string;
  private readonly toolGroupId: string;
  private readonly element: HTMLDivElement;
  private readonly background: Types.Point3;

  private renderingEngine?: RenderingEngine;
  private destroyed = false;

  constructor(element: HTMLDivElement, options: OpDicomEngineOptions = {}) {
    this.element = element;
    this.background = options.background ?? [0, 0, 0];
    const base = options.id ?? `opdicom-${++instanceCounter}`;
    this.id = base;
    this.viewportId = `${base}-viewport`;
    this.toolGroupId = `${base}-toolgroup`;
  }

  /** Boot Cornerstone3D and enable this engine's stack viewport. */
  async init(): Promise<void> {
    await ensureInitialized();
    if (this.destroyed) return;

    const renderingEngine = new RenderingEngine(this.id);
    this.renderingEngine = renderingEngine;

    renderingEngine.enableElement({
      viewportId: this.viewportId,
      type: Enums.ViewportType.STACK,
      element: this.element,
      defaultOptions: { background: this.background },
    });

    this.setupTools();
  }

  private setupTools(): void {
    const existing = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (existing) ToolGroupManager.destroyToolGroup(this.toolGroupId);

    const toolGroup = ToolGroupManager.createToolGroup(this.toolGroupId);
    if (!toolGroup) throw new Error("OpDICOM: failed to create tool group");

    toolGroup.addTool(WindowLevelTool.toolName);
    toolGroup.addTool(PanTool.toolName);
    toolGroup.addTool(ZoomTool.toolName);
    toolGroup.addTool(StackScrollTool.toolName);
    toolGroup.addViewport(this.viewportId, this.id);

    // Default bindings: left = window/level, middle = pan, right = zoom,
    // wheel = scroll through the stack.
    toolGroup.setToolActive(WindowLevelTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
    });
    toolGroup.setToolActive(PanTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
    });
    toolGroup.setToolActive(ZoomTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
    });
    toolGroup.setToolActive(StackScrollTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
    });
  }

  /** Change which tool the primary (left / single-touch) interaction drives. */
  setPrimaryTool(tool: OpDicomTool): void {
    const toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (!toolGroup) return;
    for (const name of Object.values(TOOL_NAME)) {
      if (toolGroup.getToolInstance(name)) {
        toolGroup.setToolPassive(name);
      }
    }
    toolGroup.setToolActive(TOOL_NAME[tool], {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
    });
    // Keep zoom/pan/scroll on their secondary bindings.
    toolGroup.setToolActive(ZoomTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
    });
    toolGroup.setToolActive(PanTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
    });
    toolGroup.setToolActive(StackScrollTool.toolName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
    });
  }

  /**
   * Load DICOM files (browser File/Blob) into the viewport as a stack and
   * return parsed metadata for each. The first image is displayed.
   */
  async loadFiles(files: ArrayLike<Blob>): Promise<LoadResult> {
    const blobs = Array.from(files);
    const imageIds = blobs.map((blob) => wadouri.fileManager.add(blob));
    const metadata = await Promise.all(
      blobs.map(async (blob) => {
        try {
          return await OpDicomParser.parseFile(blob).then((p) => p.metadata());
        } catch {
          return OpDicomParser.parse(new Uint8Array()).metadata();
        }
      }),
    );
    await this.loadImageIds(imageIds);
    return { imageIds, metadata };
  }

  /** Load already-resolved Cornerstone imageIds (wadouri/wadors/dicomweb). */
  async loadImageIds(imageIds: string[], startIndex = 0): Promise<void> {
    const viewport = this.getViewport();
    if (!viewport) throw new Error("OpDICOM: engine not initialized");
    await viewport.setStack(imageIds, startIndex);
    viewport.render();
  }

  /** Apply a window/level (VOI) in output units (e.g. Hounsfield for CT). */
  setWindowLevel(center: number, width: number): void {
    const viewport = this.getViewport();
    if (!viewport) return;
    viewport.setProperties({ voiRange: voiFromWindowLevel(center, width) });
    viewport.render();
  }

  /** Toggle photometric inversion (white ⇄ black). */
  setInvert(invert: boolean): void {
    const viewport = this.getViewport();
    if (!viewport) return;
    viewport.setProperties({ invert });
    viewport.render();
  }

  /** Reset pan/zoom/VOI to the image defaults. */
  reset(): void {
    const viewport = this.getViewport();
    if (!viewport) return;
    viewport.resetCamera();
    viewport.resetProperties();
    viewport.render();
  }

  /** Re-fit after the host element changes size (responsive / orientation). */
  resize(): void {
    this.renderingEngine?.resize(true, true);
  }

  private getViewport(): Types.IStackViewport | undefined {
    return this.renderingEngine?.getViewport(
      this.viewportId,
    ) as Types.IStackViewport | undefined;
  }

  /** Tear down the rendering engine, tool group and cached state. */
  destroy(): void {
    this.destroyed = true;
    const toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (toolGroup) ToolGroupManager.destroyToolGroup(this.toolGroupId);
    this.renderingEngine?.destroy();
    this.renderingEngine = undefined;
  }
}
