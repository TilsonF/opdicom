import {
  Enums,
  RenderingEngine,
  eventTarget,
  type Types,
} from "@cornerstonejs/core";
import { wadouri } from "@cornerstonejs/dicom-image-loader";
import {
  Enums as ToolEnums,
  ToolGroupManager,
  annotation,
  utilities as toolsUtilities,
} from "@cornerstonejs/tools";
import { OpDicomParser, type DicomMetadata } from "@opdicom/parser";
import {
  normalizeCineOptions,
  type CineOptions,
} from "./cine.js";
import { ensureInitialized } from "./init.js";
import {
  TOOLS,
  cornerstoneToolName,
  type OpDicomTool,
} from "./tools.js";
import { voiFromWindowLevel } from "./voi.js";

export type { OpDicomTool } from "./tools.js";

export interface OpDicomEngineOptions {
  /** Unique id; auto-derived when omitted. Useful for multiple viewers. */
  id?: string;
  /** Background color as [r, g, b] in 0..1. Defaults to black. */
  background?: Types.Point3;
  /** Notified whenever the displayed slice changes (scroll, keyboard, API). */
  onImageChange?: (index: number, count: number) => void;
}

export interface LoadResult {
  imageIds: string[];
  metadata: DicomMetadata[];
}

let instanceCounter = 0;

/**
 * Headless, framework-agnostic DICOM viewer engine. Owns one Cornerstone3D
 * rendering engine bound to a single DOM element and a stack viewport, plus a
 * tool group wired for manipulation (pan/zoom/window-level/scroll) and
 * measurement (length/angle/ROI/probe) tools.
 */
export class OpDicomEngine {
  readonly id: string;
  private readonly viewportId: string;
  private readonly toolGroupId: string;
  private readonly element: HTMLDivElement;
  private readonly background: Types.Point3;
  private readonly onImageChange?: (index: number, count: number) => void;

  private renderingEngine?: RenderingEngine;
  private destroyed = false;
  private playing = false;
  private readonly handleStackNewImage = (evt: Event): void => {
    const detail = (evt as CustomEvent).detail as
      | { viewportId?: string; imageIdIndex?: number }
      | undefined;
    if (!detail || detail.viewportId !== this.viewportId) return;
    this.onImageChange?.(this.getCurrentImageIndex(), this.getImageCount());
  };

  constructor(element: HTMLDivElement, options: OpDicomEngineOptions = {}) {
    this.element = element;
    this.background = options.background ?? [0, 0, 0];
    this.onImageChange = options.onImageChange;
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
    eventTarget.addEventListener(
      Enums.Events.STACK_NEW_IMAGE,
      this.handleStackNewImage,
    );
  }

  private setupTools(): void {
    const existing = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (existing) ToolGroupManager.destroyToolGroup(this.toolGroupId);

    const toolGroup = ToolGroupManager.createToolGroup(this.toolGroupId);
    if (!toolGroup) throw new Error("OpDICOM: failed to create tool group");

    for (const tool of TOOLS) {
      toolGroup.addTool(tool.cornerstoneName);
    }
    toolGroup.addViewport(this.viewportId, this.id);

    // Default: left = window/level. Secondary bindings stay constant so the
    // user can always pan/zoom/scroll regardless of the active primary tool.
    this.setPrimaryTool("windowLevel");
  }

  /**
   * Bind a tool to the primary (left mouse / single-touch) interaction. Keeps
   * zoom on right-click, pan on middle-click and stack scroll on the wheel.
   */
  setPrimaryTool(tool: OpDicomTool): void {
    const toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (!toolGroup) return;

    const primaryName = cornerstoneToolName(tool);
    for (const t of TOOLS) {
      if (t.cornerstoneName === primaryName) continue;
      toolGroup.setToolPassive(t.cornerstoneName);
    }
    toolGroup.setToolActive(primaryName, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
    });

    // Constant secondary bindings (skip the one now on primary).
    if (tool !== "zoom") {
      toolGroup.setToolActive(cornerstoneToolName("zoom"), {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
      });
    }
    if (tool !== "pan") {
      toolGroup.setToolActive(cornerstoneToolName("pan"), {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
      });
    }
    if (tool !== "scroll") {
      toolGroup.setToolActive(cornerstoneToolName("scroll"), {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
      });
    }
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
    if (this.playing) this.pause();
    await viewport.setStack(imageIds, startIndex);
    viewport.render();
    this.onImageChange?.(this.getCurrentImageIndex(), this.getImageCount());
  }

  // ---- stack navigation ----------------------------------------------------

  /** Total number of images in the current stack. */
  getImageCount(): number {
    return this.getViewport()?.getImageIds().length ?? 0;
  }

  /** Zero-based index of the displayed image. */
  getCurrentImageIndex(): number {
    return this.getViewport()?.getCurrentImageIdIndex() ?? 0;
  }

  /** Jump to an absolute image index (clamped to the valid range). */
  async setImageIndex(index: number): Promise<void> {
    const viewport = this.getViewport();
    if (!viewport) return;
    const count = this.getImageCount();
    if (count === 0) return;
    const clamped = Math.max(0, Math.min(index, count - 1));
    await viewport.setImageIdIndex(clamped);
    viewport.render();
  }

  /** Scroll the stack by a relative number of slices (e.g. +1 / -1). */
  scrollStack(delta: number): void {
    this.getViewport()?.scroll(delta);
  }

  // ---- cine playback -------------------------------------------------------

  /** Whether cine playback is currently running. */
  get isPlaying(): boolean {
    return this.playing;
  }

  /** Start cine (movie) playback of the current series. */
  play(options: CineOptions = {}): void {
    if (this.getImageCount() <= 1) return;
    const { framesPerSecond, loop, reverse } = normalizeCineOptions(options);
    toolsUtilities.cine.playClip(this.element, {
      framesPerSecond,
      loop,
      reverse,
    });
    this.playing = true;
  }

  /** Stop cine playback. */
  pause(): void {
    toolsUtilities.cine.stopClip(this.element);
    this.playing = false;
  }

  /** Toggle cine playback; returns the resulting playing state. */
  togglePlay(options: CineOptions = {}): boolean {
    if (this.playing) this.pause();
    else this.play(options);
    return this.playing;
  }

  // ---- display properties --------------------------------------------------

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

  /** Remove every measurement/annotation and repaint. */
  clearMeasurements(): void {
    annotation.state.removeAllAnnotations();
    this.getViewport()?.render();
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

  /** Tear down the rendering engine, tool group and listeners. */
  destroy(): void {
    this.destroyed = true;
    if (this.playing) this.pause();
    eventTarget.removeEventListener(
      Enums.Events.STACK_NEW_IMAGE,
      this.handleStackNewImage,
    );
    const toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (toolGroup) ToolGroupManager.destroyToolGroup(this.toolGroupId);
    this.renderingEngine?.destroy();
    this.renderingEngine = undefined;
  }
}
