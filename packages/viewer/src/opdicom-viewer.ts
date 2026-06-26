import {
  DEFAULT_FPS,
  MANIPULATION_TOOLS,
  MEASUREMENT_TOOLS,
  OpDicomEngine,
  WINDOW_PRESETS,
  type DicomMetadata,
  type LoadResult,
  type OpDicomTool,
  type ToolDescriptor,
} from "@opdicom/core";
import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
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

  @state() private activeTool: OpDicomTool = "windowLevel";
  @state() private hasImage = false;
  @state() private dragover = false;
  @state() private sliceIndex = 0;
  @state() private sliceCount = 0;
  @state() private isPlaying = false;
  @state() private canSaveDicom = false;
  @state() private fps = DEFAULT_FPS;
  /** Dynamic status (loading/error); empty shows the localized drop hint. */
  @state() private status = "";

  @query(".viewport") private viewportEl!: HTMLDivElement;

  private engine?: OpDicomEngine;
  private resizeObserver?: ResizeObserver;
  /** Latest parsed metadata, exposed for host apps. */
  metadata: DicomMetadata[] = [];

  override firstUpdated(_changed: PropertyValues): void {
    void this.bootstrap();
    this.resizeObserver = new ResizeObserver(() => this.engine?.resize());
    this.resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.engine?.destroy();
    this.engine = undefined;
  }

  private async bootstrap(): Promise<void> {
    if (this.engine) return;
    try {
      this.engine = new OpDicomEngine(this.viewportEl, {
        onImageChange: (index, count) => {
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
      await this.engine.init();
    } catch (error) {
      this.engine = undefined;
      this.emitError(error);
    }
  }

  // ---- public API ----------------------------------------------------------

  /** Load DICOM File/Blob objects (e.g. from an <input> or drag & drop). */
  async loadFiles(files: ArrayLike<Blob>): Promise<LoadResult | undefined> {
    await this.bootstrap();
    try {
      this.status = t(this.locale, "loading");
      const result = await this.engine!.loadFiles(files);
      this.metadata = result.metadata;
      this.hasImage = result.imageIds.length > 0;
      this.isPlaying = false;
      this.canSaveDicom = this.engine?.canDownloadDicom() ?? false;
      this.applyFirstPreset();
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
    await this.bootstrap();
    try {
      await this.engine!.loadImageIds(imageIds);
      this.hasImage = imageIds.length > 0;
    } catch (error) {
      this.emitError(error);
    }
  }

  setPrimaryTool(tool: OpDicomTool): void {
    this.activeTool = tool;
    this.engine?.setPrimaryTool(tool);
  }

  applyPreset(name: string): void {
    const preset = WINDOW_PRESETS[name];
    if (preset) this.engine?.setWindowLevel(preset.center, preset.width);
  }

  clearMeasurements(): void {
    this.engine?.clearMeasurements();
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
    this.engine?.reset();
  }

  // ---- internals -----------------------------------------------------------

  private applyFirstPreset(): void {
    const wl = this.metadata[0]?.image.windowLevels[0];
    if (wl) this.engine?.setWindowLevel(wl.center, wl.width);
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

  override render() {
    const tr = (k: MessageKey) => t(this.locale, k);
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
        <button type="button" @click=${() => this.clearMeasurements()} title=${tr("clear")}>
          ${tr("clear")}
        </button>
        <button type="button" @click=${() => this.reset()} title=${tr("reset")}>
          ${tr("reset")}
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
        @drop=${this.noDnd ? null : this.onDrop}
        @dragover=${this.noDnd ? null : this.onDragOver}
        @dragleave=${this.noDnd ? null : this.onDragLeave}
      >
        <div class="viewport" part="viewport"></div>
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
