import {
  Enums,
  RenderingEngine,
  eventTarget,
  utilities as csUtilities,
  type Types,
} from "@cornerstonejs/core";
import { wadors, wadouri } from "@cornerstonejs/dicom-image-loader";
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
import {
  DicomWebClient,
  DwTag,
  buildWadoRsImageId,
  dwString,
  sortInstanceMetadata,
  type DicomJsonDataset,
  type DicomWebConfig,
  type SeriesQuery,
} from "./dicomweb.js";
import {
  buildDicomFilename,
  buildExportFilename,
  mimeForFormat,
  normalizeQuality,
  type ExportOptions,
} from "./export.js";
import {
  sampleValue,
  worldToIJK,
  type ImageGeometry,
  type Vec3,
} from "./geometry.js";
import { ensureInitialized } from "./init.js";
import {
  TOOLS,
  cornerstoneToolName,
  type OpDicomTool,
} from "./tools.js";
import { voiFromWindowLevel, windowLevelFromVoi } from "./voi.js";
import { hasDicomMagic, isWebImageType } from "./web-image.js";
import { imageFileToDicom } from "./web-image-loader.js";

/** Result of sampling the image under a canvas point. */
export interface ProbeResult {
  world: Vec3;
  ijk: [number, number];
  value: number | undefined;
}

export type { OpDicomTool } from "./tools.js";

export interface OpDicomEngineOptions {
  /** Unique id; auto-derived when omitted. Useful for multiple viewers. */
  id?: string;
  /** Background color as [r, g, b] in 0..1. Defaults to black. */
  background?: Types.Point3;
  /** Notified whenever the displayed slice changes (scroll, keyboard, API). */
  onImageChange?: (index: number, count: number) => void;
  /**
   * Share an existing RenderingEngine instead of creating one. Multiple cells
   * in a grid MUST share a single engine — separate engines each grab WebGL
   * contexts and exhaust the shared pool. When shared, this engine disables
   * only its own viewport on destroy (it doesn't own the engine).
   */
  renderingEngine?: RenderingEngine;
}

export interface LoadResult {
  imageIds: string[];
  metadata: DicomMetadata[];
}

let instanceCounter = 0;

/**
 * Composite an annotation SVG layer onto a 2D canvas context. The SVG is cloned
 * and sized to the target canvas, serialized to a data URL and rasterized via
 * an Image. Best-effort: on any load error the image is left without overlays.
 */
function drawSvgOverlay(
  svg: SVGSVGElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("viewBox", `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
  const serialized = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

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

  private readonly renderingEngineId: string;
  private readonly sharedEngine?: RenderingEngine;
  private renderingEngine?: RenderingEngine;
  private destroyed = false;
  private playing = false;
  /** Original DICOM blobs for file-loaded stacks, indexed like the stack. */
  private sourceBlobs: Blob[] = [];
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
    this.sharedEngine = options.renderingEngine;
    // All cells sharing an engine report the same renderingEngineId (required
    // by synchronizers) but keep distinct viewportIds.
    this.renderingEngineId = this.sharedEngine?.id ?? this.id;
  }

  /** Identifiers for wiring this viewport into a Cornerstone synchronizer. */
  get viewportRef(): { renderingEngineId: string; viewportId: string } {
    return { renderingEngineId: this.renderingEngineId, viewportId: this.viewportId };
  }

  /** Boot Cornerstone3D and enable this engine's stack viewport. */
  async init(): Promise<void> {
    await ensureInitialized();
    if (this.destroyed) return;

    const renderingEngine = this.sharedEngine ?? new RenderingEngine(this.id);
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
    toolGroup.addViewport(this.viewportId, this.renderingEngineId);

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
   * return parsed metadata. A multi-frame file (NumberOfFrames > 1, e.g. an US
   * or XA cine loop) is expanded into one imageId per frame so cine/scroll play
   * the embedded frames. The first image is displayed.
   */
  async loadFiles(files: ArrayLike<Blob>): Promise<LoadResult> {
    const blobs = await Promise.all(
      Array.from(files).map((b) => this.normalizeToDicom(b)),
    );
    const imageIds: string[] = [];
    const metadata: DicomMetadata[] = [];
    const blobForImage: Blob[] = [];

    for (const blob of blobs) {
      const base = wadouri.fileManager.add(blob);
      let meta: DicomMetadata;
      try {
        meta = (await OpDicomParser.parseFile(blob)).metadata();
      } catch {
        meta = OpDicomParser.parse(new Uint8Array()).metadata();
      }
      const frames = meta.image.numberOfFrames ?? 1;
      if (frames > 1) {
        // wadouri frame index is 1-based (?frame=1..N).
        for (let f = 1; f <= frames; f++) {
          imageIds.push(`${base}?frame=${f}`);
          metadata.push(meta);
          blobForImage.push(blob);
        }
      } else {
        imageIds.push(base);
        metadata.push(meta);
        blobForImage.push(blob);
      }
    }

    await this.loadImageIds(imageIds);
    // Retain originals (aligned to imageIds) for "download DICOM".
    this.sourceBlobs = blobForImage;
    return { imageIds, metadata };
  }

  /**
   * Pass DICOM through unchanged; wrap a plain web image (PNG/JPEG/…) into an
   * RGB DICOM so it can render via the normal pipeline.
   */
  private async normalizeToDicom(blob: Blob): Promise<Blob> {
    const head = new Uint8Array(await blob.slice(0, 132).arrayBuffer());
    if (hasDicomMagic(head)) return blob;
    const name = blob instanceof File ? blob.name : undefined;
    if (isWebImageType(blob.type, name)) {
      const dicom = await imageFileToDicom(blob);
      return new Blob([dicom as BlobPart], { type: "application/dicom" });
    }
    return blob; // assume preamble-less DICOM; let the parser/loader try
  }

  /**
   * Load a DICOM series from a DICOMweb server (WADO-RS). Retrieves the series
   * metadata, registers each instance with Cornerstone, builds `wadors`
   * imageIds sorted by InstanceNumber and displays the stack.
   */
  async loadFromDicomWeb(
    config: DicomWebConfig,
    query: SeriesQuery,
  ): Promise<{ imageIds: string[]; instances: DicomJsonDataset[] }> {
    const client = new DicomWebClient(config);
    const instances = sortInstanceMetadata(
      await client.retrieveSeriesMetadata(query),
    );

    const imageIds: string[] = [];
    for (const instance of instances) {
      const sopInstanceUID = dwString(instance, DwTag.SOPInstanceUID);
      const seriesInstanceUID =
        dwString(instance, DwTag.SeriesInstanceUID) ?? query.seriesInstanceUID;
      if (!sopInstanceUID) continue;
      const imageId = buildWadoRsImageId({
        wadoRsRoot: config.wadoRsRoot,
        studyInstanceUID: query.studyInstanceUID,
        seriesInstanceUID,
        sopInstanceUID,
      });
      // Register the instance metadata so Cornerstone can render the frame.
      wadors.metaDataManager.add(imageId, instance as never);
      imageIds.push(imageId);
    }

    if (imageIds.length === 0) {
      throw new Error("OpDICOM: DICOMweb series returned no displayable instances");
    }
    await this.loadImageIds(imageIds);
    return { imageIds, instances };
  }

  /** Load already-resolved Cornerstone imageIds (wadouri/wadors/dicomweb). */
  async loadImageIds(imageIds: string[], startIndex = 0): Promise<void> {
    const viewport = this.getViewport();
    if (!viewport) throw new Error("OpDICOM: engine not initialized");
    if (this.playing) this.pause();
    // Raw imageIds (incl. DICOMweb) have no retained originals; clear them.
    this.sourceBlobs = [];
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

  /** Current window center/width (from the active VOI range), if any. */
  getDisplayWindowLevel(): { center: number; width: number } | undefined {
    const range = this.getViewport()?.getProperties().voiRange;
    return range ? windowLevelFromVoi(range) : undefined;
  }

  /** Current zoom factor (1 = fit). */
  getZoomFactor(): number {
    return this.getViewport()?.getZoom() ?? 1;
  }

  /**
   * Sample the displayed image under a canvas-space point: returns the world
   * (patient) coordinate, the image column/row and the pixel value (undefined
   * outside the image). Best-effort; returns undefined if nothing is loaded.
   */
  probeAtCanvas(canvasPos: [number, number]): ProbeResult | undefined {
    const viewport = this.getViewport();
    if (!viewport) return undefined;
    try {
      const world = viewport.canvasToWorld(canvasPos) as Vec3;
      const data = viewport.getImageData();
      if (!data) return undefined;
      const geom: ImageGeometry = {
        origin: data.origin as Vec3,
        spacing: data.spacing as Vec3,
        direction: Array.from(data.direction as ArrayLike<number>),
        dimensions: data.dimensions as Vec3,
      };
      const [i, j] = worldToIJK(world, geom);
      const value = sampleValue(
        data.scalarData as ArrayLike<number>,
        geom.dimensions,
        i,
        j,
      );
      return { world, ijk: [i, j], value };
    } catch {
      return undefined;
    }
  }

  /** Toggle photometric inversion (white ⇄ black). */
  setInvert(invert: boolean): void {
    const viewport = this.getViewport();
    if (!viewport) return;
    viewport.setProperties({ invert });
    viewport.render();
  }

  /** Names of the colormaps registered with Cornerstone (e.g. "Hot", "Jet"). */
  getColormapNames(): string[] {
    try {
      return (csUtilities.colormap.getColormapNames() as string[]) ?? [];
    } catch {
      return [];
    }
  }

  /** Apply a colormap by name (pseudo-color). */
  setColormap(name: string): void {
    const viewport = this.getViewport();
    if (!viewport) return;
    viewport.setProperties({ colormap: { name } });
    viewport.render();
  }

  /** Toggle pixel smoothing (LINEAR) vs pixelated (NEAREST) interpolation. */
  setSmoothing(smooth: boolean): void {
    const viewport = this.getViewport();
    if (!viewport) return;
    viewport.setProperties({
      interpolationType: smooth
        ? Enums.InterpolationType.LINEAR
        : Enums.InterpolationType.NEAREST,
    });
    viewport.render();
  }

  /** Remove every measurement/annotation and repaint. */
  clearMeasurements(): void {
    annotation.state.removeAllAnnotations();
    this.getViewport()?.render();
  }

  // ---- export --------------------------------------------------------------

  /**
   * Render the current view to a fresh canvas, optionally compositing the
   * measurement/annotation SVG overlay on top of the image.
   */
  async captureToCanvas(withAnnotations = true): Promise<HTMLCanvasElement> {
    const source = this.getViewport()?.getCanvas();
    if (!source) throw new Error("OpDICOM: nothing to export");
    const out = document.createElement("canvas");
    out.width = source.width;
    out.height = source.height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("OpDICOM: 2D canvas context unavailable");
    ctx.drawImage(source, 0, 0);
    if (withAnnotations) {
      const svg = this.element.querySelector<SVGSVGElement>("svg.svg-layer");
      if (svg) await drawSvgOverlay(svg, ctx, out.width, out.height);
    }
    return out;
  }

  /** Export the current view as a data URL (PNG/JPEG). */
  async exportImage(options: ExportOptions = {}): Promise<string> {
    const format = options.format ?? "png";
    const canvas = await this.captureToCanvas(options.withAnnotations ?? true);
    return canvas.toDataURL(
      mimeForFormat(format),
      format === "jpeg" ? normalizeQuality(options.quality) : undefined,
    );
  }

  /** Whether the displayed instance has an original DICOM available to save. */
  canDownloadDicom(): boolean {
    return this.sourceBlobs[this.getCurrentImageIndex()] !== undefined;
  }

  /**
   * Download the original DICOM (Part-10) of the currently displayed instance.
   * Available for file-loaded stacks; DICOMweb retrieval is a separate step.
   */
  downloadCurrentDicom(filename?: string): void {
    const blob = this.sourceBlobs[this.getCurrentImageIndex()];
    if (!blob) {
      throw new Error("OpDICOM: no original DICOM available for this instance");
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDicomFilename(filename);
    link.rel = "noopener";
    link.click();
    // Revoke after a tick so the download isn't cancelled.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  /** Export and trigger a browser download of the current view. */
  async downloadImage(options: ExportOptions = {}): Promise<void> {
    const format = options.format ?? "png";
    const dataUrl = await this.exportImage(options);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = buildExportFilename(options.filename, format);
    link.rel = "noopener";
    link.click();
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
    if (this.sharedEngine) {
      // Don't tear down a shared engine — just remove this viewport from it.
      try {
        this.sharedEngine.disableElement(this.viewportId);
      } catch {
        /* already gone */
      }
    } else {
      this.renderingEngine?.destroy();
    }
    this.renderingEngine = undefined;
  }
}
