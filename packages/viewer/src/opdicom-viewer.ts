import {
  DEFAULT_FPS,
  DRAW_TOOLS,
  MANIPULATION_TOOLS,
  MEASUREMENT_TOOLS,
  OpDicomEngine,
  WINDOW_PRESETS,
  createSharedRenderingEngine,
  createViewportSync,
  layoutDims,
  pickColormaps,
  LAYOUTS,
  type DicomMetadata,
  type LayoutName,
  type SharedRenderingEngine,
  type LoadResult,
  type OpDicomTool,
  type ProbeResult,
  type ToolDescriptor,
} from "@opdicom/core";
import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators.js";
import { LANGS, resolveLang, t, type Lang, type MessageKey } from "./i18n.js";

/**
 * `<opdicom-viewer>` — a framework-agnostic DICOM viewer Web Component.
 *
 * @fires opdicom-load   - detail: LoadResult, after files/imageIds load
 * @fires opdicom-error  - detail: { error: unknown }
 * @fires opdicom-slice  - detail: { index, count }, when the slice changes
 *
 * @cssprop --opdicom-bg            - viewport background (default #000)
 * @cssprop --opdicom-toolbar-bg    - toolbar background
 * @cssprop --opdicom-accent        - active control accent color
 * @cssprop --opdicom-fg            - foreground / text color
 */
@customElement("opdicom-viewer")
export class OpdicomViewer extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 240px;
      background: var(--opdicom-bg, #000);
      color: var(--opdicom-fg, #e6e6e6);
      font-family: var(
        --opdicom-font,
        system-ui,
        -apple-system,
        Segoe UI,
        Roboto,
        sans-serif
      );
      position: relative;
      contain: layout style;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      padding: 6px 8px;
      background: var(--opdicom-toolbar-bg, #15181d);
      border-bottom: 1px solid var(--opdicom-border, #2a2f37);
      user-select: none;
    }
    .toolbar.hidden {
      display: none;
    }
    .group {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .divider {
      width: 1px;
      align-self: stretch;
      background: var(--opdicom-border, #2a2f37);
      margin: 2px 4px;
    }
    button,
    select {
      background: var(--opdicom-control-bg, #232830);
      color: inherit;
      border: 1px solid var(--opdicom-border, #2a2f37);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
      line-height: 1;
    }
    button:hover,
    select:hover {
      background: var(--opdicom-control-hover, #2c333d);
    }
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    button[aria-pressed="true"] {
      background: var(--opdicom-accent, #2f6df6);
      border-color: var(--opdicom-accent, #2f6df6);
      color: #fff;
    }
    .spacer {
      flex: 1;
    }
    .slice {
      font-variant-numeric: tabular-nums;
      font-size: 12px;
      color: var(--opdicom-muted, #9aa4b2);
      padding: 0 6px;
    }
    .fps {
      width: 48px;
      background: var(--opdicom-control-bg, #232830);
      color: inherit;
      border: 1px solid var(--opdicom-border, #2a2f37);
      border-radius: 6px;
      padding: 5px 6px;
      font-size: 13px;
    }
    .fps-label {
      font-size: 12px;
      color: var(--opdicom-muted, #9aa4b2);
    }
    .lang {
      min-width: 56px;
    }
    [hidden] {
      display: none !important;
    }
    .stage {
      position: relative;
      flex: 1;
      min-height: 0;
      outline: none;
    }
    .viewport {
      position: absolute;
      inset: 0;
    }
    .dropzone {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      pointer-events: none;
      opacity: 0.7;
      font-size: 14px;
      padding: 24px;
    }
    .dropzone.dragover {
      outline: 2px dashed var(--opdicom-accent, #2f6df6);
      outline-offset: -8px;
      opacity: 1;
    }
    .hidden {
      display: none !important;
    }
    .overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      font-size: 11px;
      line-height: 1.45;
      color: var(--opdicom-overlay-fg, #e8eef6);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95);
      font-variant-numeric: tabular-nums;
    }
    .overlay .corner {
      position: absolute;
      padding: 8px 10px;
      max-width: 46%;
      white-space: pre-line;
    }
    .overlay .tl {
      top: 0;
      left: 0;
    }
    .overlay .tr {
      top: 0;
      right: 0;
      text-align: right;
    }
    .overlay .bl {
      bottom: 0;
      left: 0;
    }
    .overlay .br {
      bottom: 0;
      right: 0;
      text-align: right;
    }
    .grid {
      position: absolute;
      inset: 0;
      display: grid;
      gap: 2px;
      background: var(--opdicom-border, #2a2f37);
    }
    .cell {
      position: relative;
      min-width: 0;
      min-height: 0;
      background: var(--opdicom-bg, #000);
    }
    .cell.active {
      outline: 1px solid var(--opdicom-accent, #2f6df6);
      outline-offset: -1px;
    }
  `;

  /** Hide the built-in toolbar (use your own UI via the public methods). */
  @property({ type: Boolean, attribute: "no-toolbar" }) noToolbar = false;

  /** Disable drag & drop loading. */
  @property({ type: Boolean, attribute: "no-dnd" }) noDnd = false;

  /** UI language ("en" | "es"). Defaults to the browser language. */
  @property({ reflect: true })
  locale: Lang = resolveLang(
    typeof navigator !== "undefined" ? navigator.language : "en",
  );

  /** Grid layout: "1x1" | "2x1" | "1x2" | "2x2". */
  @property({ reflect: true }) layout: LayoutName = "1x1";

  @state() private activeTool: OpDicomTool = "windowLevel";
  @state() private hasImage = false;
  @state() private dragover = false;
  @state() private sliceIndex = 0;
  @state() private sliceCount = 0;
  @state() private isPlaying = false;
  @state() private canSaveDicom = false;
  @state() private fps = DEFAULT_FPS;
  @state() private showOverlay = true;
  @state() private smoothing = true;
  @state() private colormaps: string[] = [];
  @state() private wl?: { center: number; width: number };
  @state() private zoom = 1;
  @state() private cursor?: ProbeResult;
  /** Dynamic status (loading/error); empty shows the localized drop hint. */
  @state() private status = "";

  @queryAll(".viewport") private viewportEls!: NodeListOf<HTMLDivElement>;

  private engines: OpDicomEngine[] = [];
  private sharedEngine?: SharedRenderingEngine;
  private activeIndex = 0;
  private teardownSync?: () => void;
  private lastFiles?: Blob[];
  private resizeObserver?: ResizeObserver;
  /** Latest parsed metadata, exposed for host apps. */
  metadata: DicomMetadata[] = [];

  /** The cell the toolbar / overlay / cine act on. */
  private get engine(): OpDicomEngine | undefined {
    return this.engines[this.activeIndex];
  }

  override firstUpdated(_changed: PropertyValues): void {
    this.resizeObserver = new ResizeObserver(() =>
      this.engines.forEach((e) => e.resize()),
    );
    void this.rebuild();
  }

  override updated(changed: PropertyValues): void {
    if (changed.has("layout") && this.engines.length) void this.rebuild();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.teardown();
  }

  private teardown(): void {
    this.teardownSync?.();
    this.teardownSync = undefined;
    this.engines.forEach((e) => e.destroy());
    this.engines = [];
    this.sharedEngine?.destroy();
    this.sharedEngine = undefined;
  }

  /** (Re)create one engine per grid cell and re-load the current stack. */
  private async rebuild(): Promise<void> {
    this.teardown();
    await this.updateComplete; // ensure the new grid cells exist in the DOM
    try {
      const cells = Array.from(this.viewportEls);
      // One shared RenderingEngine for all cells (avoids exhausting the WebGL
      // context pool, which would blank cells in a 2x2+ grid).
      const shared = await createSharedRenderingEngine();
      this.sharedEngine = shared;
      const engines: OpDicomEngine[] = [];
      for (let i = 0; i < cells.length; i++) {
        const engine = new OpDicomEngine(cells[i]!, {
          renderingEngine: shared,
          onImageChange: (index, count) => {
            if (this.engines[this.activeIndex] !== engine) return;
            this.sliceIndex = index;
            this.sliceCount = count;
            this.dispatchEvent(
              new CustomEvent("opdicom-slice", {
                detail: { index, count },
                bubbles: true,
                composed: true,
              }),
            );
          },
        });
        await engine.init();
        engines.push(engine);
      }
      this.engines = engines;
      this.activeIndex = Math.min(this.activeIndex, engines.length - 1);
      this.colormaps = pickColormaps(engines[0]?.getColormapNames() ?? []);
      this.teardownSync = createViewportSync(engines);

      // Observe each cell so Cornerstone re-fits when the grid lays out (the
      // host size is unchanged on a layout switch, so observing the host alone
      // would leave new cells with a stale/zero canvas size — and blank).
      this.resizeObserver?.disconnect();
      Array.from(cells).forEach((el) => this.resizeObserver?.observe(el));

      if (this.lastFiles) await this.loadIntoAll(this.lastFiles);
      requestAnimationFrame(() => this.engines.forEach((e) => e.resize()));
    } catch (error) {
      this.emitError(error);
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.engines.length) await this.rebuild();
  }

  /** Load the same stack into every grid cell. */
  private async loadIntoAll(
    files: ArrayLike<Blob>,
  ): Promise<LoadResult | undefined> {
    const results = await Promise.all(
      this.engines.map((e) => e.loadFiles(files)),
    );
    return results[0];
  }

  // ---- public API ----------------------------------------------------------

  /** Load DICOM File/Blob objects (e.g. from an <input> or drag & drop). */
  async loadFiles(files: ArrayLike<Blob>): Promise<LoadResult | undefined> {
    await this.ensureReady();
    try {
      this.status = t(this.locale, "loading");
      this.lastFiles = Array.from(files);
      const result = await this.loadIntoAll(files);
      if (!result) return undefined;
      this.metadata = result.metadata;
      this.hasImage = result.imageIds.length > 0;
      this.isPlaying = false;
      this.canSaveDicom = this.engine?.canDownloadDicom() ?? false;
      this.applyFirstPreset();
      this.wl = this.engine?.getDisplayWindowLevel();
      this.zoom = this.engine?.getZoomFactor() ?? 1;
      this.dispatchEvent(
        new CustomEvent("opdicom-load", { detail: result, bubbles: true, composed: true }),
      );
      return result;
    } catch (error) {
      this.emitError(error);
      return undefined;
    }
  }

  /** Load Cornerstone imageIds directly (wadouri / wadors / dicomweb). */
  async loadImageIds(imageIds: string[]): Promise<void> {
    await this.ensureReady();
    try {
      await Promise.all(this.engines.map((e) => e.loadImageIds(imageIds)));
      this.hasImage = imageIds.length > 0;
    } catch (error) {
      this.emitError(error);
    }
  }

  setPrimaryTool(tool: OpDicomTool): void {
    this.activeTool = tool;
    this.engines.forEach((e) => e.setPrimaryTool(tool));
  }

  applyPreset(name: string): void {
    const preset = WINDOW_PRESETS[name];
    if (preset) this.engines.forEach((e) => e.setWindowLevel(preset.center, preset.width));
  }

  clearMeasurements(): void {
    this.engines.forEach((e) => e.clearMeasurements());
  }

  applyColormap(name: string): void {
    if (name) this.engines.forEach((e) => e.setColormap(name));
  }

  toggleSmoothing(): void {
    this.smoothing = !this.smoothing;
    this.engines.forEach((e) => e.setSmoothing(this.smoothing));
  }

  nextSlice(): void {
    this.engine?.scrollStack(1);
  }

  previousSlice(): void {
    this.engine?.scrollStack(-1);
  }

  /** Download the current view as an image (PNG by default, with annotations). */
  async downloadImage(
    options: Parameters<OpDicomEngine["downloadImage"]>[0] = {},
  ): Promise<void> {
    const filename =
      options.filename ?? this.metadata[0]?.series.description ?? "opdicom-export";
    await this.engine?.downloadImage({ ...options, filename });
  }

  /** Download the original DICOM of the currently displayed instance. */
  downloadDicom(filename?: string): void {
    const name =
      filename ?? this.metadata[0]?.series.description ?? "opdicom-instance";
    try {
      this.engine?.downloadCurrentDicom(name);
    } catch (error) {
      this.emitError(error);
    }
  }

  /** Toggle cine playback at the current fps. */
  togglePlay(): void {
    this.isPlaying = this.engine?.togglePlay({ fps: this.fps }) ?? false;
  }

  /** Set the cine frame rate; restarts playback if currently playing. */
  setFps(fps: number): void {
    this.fps = fps;
    if (this.isPlaying) {
      this.engine?.play({ fps });
    }
  }

  reset(): void {
    this.engines.forEach((e) => e.reset());
  }

  // ---- internals -----------------------------------------------------------

  private applyFirstPreset(): void {
    const wl = this.metadata[0]?.image.windowLevels[0];
    if (wl) this.engines.forEach((e) => e.setWindowLevel(wl.center, wl.width));
  }

  private emitError(error: unknown): void {
    this.status = `Error: ${error instanceof Error ? error.message : String(error)}`;
    this.dispatchEvent(
      new CustomEvent("opdicom-error", {
        detail: { error },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onDrop = (e: DragEvent): void => {
    e.preventDefault();
    this.dragover = false;
    const files = e.dataTransfer?.files;
    if (files && files.length) void this.loadFiles(files);
  };

  private onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    this.dragover = true;
  };

  private onDragLeave = (): void => {
    this.dragover = false;
  };

  private rafPending = false;
  private lastMove?: [number, number];
  private onCellMove(e: MouseEvent, index: number): void {
    const el = this.viewportEls[index];
    if (!this.engines[index] || !this.hasImage || !el) return;
    this.activeIndex = index;
    const rect = el.getBoundingClientRect();
    this.lastMove = [e.clientX - rect.left, e.clientY - rect.top];
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      const engine = this.engines[this.activeIndex];
      if (!engine || !this.lastMove) return;
      this.cursor = engine.probeAtCanvas(this.lastMove);
      this.wl = engine.getDisplayWindowLevel();
      this.zoom = engine.getZoomFactor();
    });
  }

  private onMouseLeave = (): void => {
    this.cursor = undefined;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.engine || this.sliceCount === 0) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
      case "PageDown":
        this.engine.scrollStack(1);
        e.preventDefault();
        break;
      case "ArrowUp":
      case "ArrowLeft":
      case "PageUp":
        this.engine.scrollStack(-1);
        e.preventDefault();
        break;
      case "Home":
        void this.engine.setImageIndex(0);
        e.preventDefault();
        break;
      case "End":
        void this.engine.setImageIndex(this.sliceCount - 1);
        e.preventDefault();
        break;
    }
  };

  private toolButton(tool: ToolDescriptor) {
    const label = t(this.locale, tool.id as MessageKey);
    return html`<button
      type="button"
      aria-pressed=${this.activeTool === tool.id}
      @click=${() => this.setPrimaryTool(tool.id)}
      title=${label}
    >
      ${label}
    </button>`;
  }

  private overlayLayer() {
    if (!this.showOverlay || !this.hasImage) return null;
    const m = this.metadata[0];
    const f1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "—");
    const lines = (...xs: (string | undefined)[]) =>
      xs.filter((x) => x && x.length).join("\n");
    const c = this.cursor;
    return html`
      <div class="overlay" part="overlay">
        <div class="corner tl">
          ${lines(m?.patient.name, m?.patient.id, m?.series.modality)}
        </div>
        <div class="corner tr">
          ${lines(m?.study.description, m?.study.date, m?.series.description)}
        </div>
        <div class="corner bl">
          ${lines(
            this.wl
              ? `W/L: ${Math.round(this.wl.center)} / ${Math.round(this.wl.width)}`
              : undefined,
            `Zoom: ${Math.round(this.zoom * 100)}%`,
          )}
        </div>
        <div class="corner br">
          ${lines(
            this.sliceCount > 1
              ? `${this.sliceIndex + 1}/${this.sliceCount}`
              : undefined,
            c
              ? `(${c.ijk[0]}, ${c.ijk[1]})${c.value !== undefined ? ` = ${Math.round(c.value)}` : ""}`
              : undefined,
            c ? `${f1(c.world[0])}, ${f1(c.world[1])}, ${f1(c.world[2])} mm` : undefined,
          )}
        </div>
      </div>
    `;
  }

  override render() {
    const tr = (k: MessageKey) => t(this.locale, k);
    const dims = layoutDims(this.layout);
    return html`
      <div class=${`toolbar ${this.noToolbar ? "hidden" : ""}`} part="toolbar">
        <div class="group">
          ${MANIPULATION_TOOLS.map((desc) => this.toolButton(desc))}
        </div>
        <div class="divider"></div>
        <div class="group">
          ${MEASUREMENT_TOOLS.map((desc) => this.toolButton(desc))}
        </div>
        <div class="divider"></div>
        <div class="group">
          ${DRAW_TOOLS.map((desc) => this.toolButton(desc))}
        </div>
        <div class="divider"></div>
        <select
          @change=${(e: Event) =>
            this.applyPreset((e.target as HTMLSelectElement).value)}
          title=${tr("preset")}
        >
          <option value="">${tr("preset")}</option>
          ${Object.keys(WINDOW_PRESETS).map(
            (name) => html`<option value=${name}>${name}</option>`,
          )}
        </select>
        <select
          ?hidden=${this.colormaps.length === 0}
          @change=${(e: Event) => {
            const sel = e.target as HTMLSelectElement;
            this.applyColormap(sel.value);
            sel.selectedIndex = 0;
          }}
          title=${tr("colormap")}
        >
          <option value="">${tr("colormap")}</option>
          ${this.colormaps.map((name) => html`<option value=${name}>${name}</option>`)}
        </select>
        <button
          type="button"
          aria-pressed=${this.smoothing}
          @click=${() => this.toggleSmoothing()}
          title=${tr("smoothing")}
        >
          ${tr("smoothing")}
        </button>
        <button type="button" @click=${() => this.clearMeasurements()} title=${tr("clear")}>
          ${tr("clear")}
        </button>
        <button type="button" @click=${() => this.reset()} title=${tr("reset")}>
          ${tr("reset")}
        </button>
        <button
          type="button"
          aria-pressed=${this.showOverlay}
          @click=${() => (this.showOverlay = !this.showOverlay)}
          title=${tr("overlay")}
        >
          ${tr("overlay")}
        </button>
        <button
          type="button"
          ?disabled=${!this.hasImage}
          @click=${() => void this.downloadImage({ format: "png" })}
          title=${tr("exportPng")}
        >
          ${tr("exportPng")}
        </button>
        <button
          type="button"
          ?disabled=${!this.canSaveDicom}
          @click=${() => this.downloadDicom()}
          title=${tr("exportDicom")}
        >
          ${tr("exportDicom")}
        </button>
        <div class="divider" ?hidden=${this.sliceCount <= 1}></div>
        <div class="group" ?hidden=${this.sliceCount <= 1}>
          <button
            type="button"
            aria-pressed=${this.isPlaying}
            @click=${() => this.togglePlay()}
            title=${this.isPlaying ? tr("pause") : tr("play")}
          >
            ${this.isPlaying ? "⏸" : "▶"}
          </button>
          <input
            class="fps"
            type="number"
            min="1"
            max="60"
            .value=${String(this.fps)}
            @change=${(e: Event) =>
              this.setFps(Number((e.target as HTMLInputElement).value))}
            title=${tr("fps")}
          />
          <span class="fps-label">${tr("fps")}</span>
        </div>
        <span class="spacer"></span>
        <span class="slice" ?hidden=${this.sliceCount <= 1}>
          ${this.sliceIndex + 1} / ${this.sliceCount}
        </span>
        <select
          class="lang"
          title="Layout"
          .value=${this.layout}
          @change=${(e: Event) =>
            (this.layout = (e.target as HTMLSelectElement).value as LayoutName)}
        >
          ${LAYOUTS.map((l) => html`<option value=${l}>${l}</option>`)}
        </select>
        <select
          class="lang"
          title=${tr("language")}
          .value=${this.locale}
          @change=${(e: Event) =>
            (this.locale = (e.target as HTMLSelectElement).value as Lang)}
        >
          ${LANGS.map(
            (l) => html`<option value=${l}>${l.toUpperCase()}</option>`,
          )}
        </select>
      </div>
      <div
        class="stage"
        tabindex="0"
        @keydown=${this.onKeyDown}
        @mouseleave=${this.onMouseLeave}
        @drop=${this.noDnd ? null : this.onDrop}
        @dragover=${this.noDnd ? null : this.onDragOver}
        @dragleave=${this.noDnd ? null : this.onDragLeave}
      >
        <div
          class="grid"
          style=${`grid-template-columns: repeat(${dims.cols}, 1fr); grid-template-rows: repeat(${dims.rows}, 1fr);`}
        >
          ${Array.from(
            { length: dims.cells },
            (_unused, i) => html`
              <div
                class=${`cell ${i === this.activeIndex && dims.cells > 1 ? "active" : ""}`}
                @mousemove=${(e: MouseEvent) => this.onCellMove(e, i)}
                @mousedown=${() => (this.activeIndex = i)}
              >
                <div class="viewport" part="viewport"></div>
                ${i === this.activeIndex ? this.overlayLayer() : null}
              </div>
            `,
          )}
        </div>
        <div
          class=${`dropzone ${this.dragover ? "dragover" : ""} ${this.hasImage ? "hidden" : ""}`}
        >
          ${this.status || t(this.locale, "dropHint")}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "opdicom-viewer": OpdicomViewer;
  }
}
