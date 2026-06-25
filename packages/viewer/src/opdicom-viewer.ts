import {
  OpDicomEngine,
  WINDOW_PRESETS,
  type DicomMetadata,
  type LoadResult,
  type OpDicomTool,
} from "@opdicom/core";
import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

/**
 * `<opdicom-viewer>` — a framework-agnostic DICOM viewer Web Component.
 *
 * @fires opdicom-load   - detail: LoadResult, after files/imageIds load
 * @fires opdicom-error  - detail: { error: unknown }
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
    button[aria-pressed="true"] {
      background: var(--opdicom-accent, #2f6df6);
      border-color: var(--opdicom-accent, #2f6df6);
      color: #fff;
    }
    .spacer {
      flex: 1;
    }
    .stage {
      position: relative;
      flex: 1;
      min-height: 0;
    }
    .viewport {
      position: absolute;
      inset: 0;
      /* Cornerstone manages the canvas inside this element. */
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

  @state() private activeTool: OpDicomTool = "windowLevel";
  @state() private hasImage = false;
  @state() private dragover = false;
  @state() private status = "Drop a DICOM file here, or use loadFiles().";

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
    try {
      this.engine = new OpDicomEngine(this.viewportEl);
      await this.engine.init();
    } catch (error) {
      this.emitError(error);
    }
  }

  // ---- public API ----------------------------------------------------------

  /** Load DICOM File/Blob objects (e.g. from an <input> or drag & drop). */
  async loadFiles(files: ArrayLike<Blob>): Promise<LoadResult | undefined> {
    if (!this.engine) await this.bootstrap();
    try {
      this.status = "Loading…";
      const result = await this.engine!.loadFiles(files);
      this.metadata = result.metadata;
      this.hasImage = result.imageIds.length > 0;
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
    if (!this.engine) await this.bootstrap();
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

  private toolButton(tool: OpDicomTool, label: string) {
    return html`<button
      type="button"
      aria-pressed=${this.activeTool === tool}
      @click=${() => this.setPrimaryTool(tool)}
      title=${label}
    >
      ${label}
    </button>`;
  }

  override render() {
    return html`
      <div class=${`toolbar ${this.noToolbar ? "hidden" : ""}`} part="toolbar">
        ${this.toolButton("windowLevel", "W/L")}
        ${this.toolButton("zoom", "Zoom")}
        ${this.toolButton("pan", "Pan")}
        ${this.toolButton("scroll", "Scroll")}
        <select
          @change=${(e: Event) =>
            this.applyPreset((e.target as HTMLSelectElement).value)}
          title="Window presets"
        >
          <option value="">Preset…</option>
          ${Object.keys(WINDOW_PRESETS).map(
            (name) => html`<option value=${name}>${name}</option>`,
          )}
        </select>
        <button type="button" @click=${() => this.reset()} title="Reset view">
          Reset
        </button>
        <span class="spacer"></span>
      </div>
      <div
        class="stage"
        @drop=${this.noDnd ? null : this.onDrop}
        @dragover=${this.noDnd ? null : this.onDragOver}
        @dragleave=${this.noDnd ? null : this.onDragLeave}
      >
        <div class="viewport" part="viewport"></div>
        <div
          class=${`dropzone ${this.dragover ? "dragover" : ""} ${this.hasImage ? "hidden" : ""}`}
        >
          ${this.status}
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
