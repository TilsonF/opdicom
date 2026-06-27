# OpDICOM Roadmap

Living checklist of what's done and what's next. Each item moves through a PR
(branch → review → owner-approved merge). Keep this file updated in the same PR
that delivers the feature.

Legend: ✅ done · 🚧 in progress · ⬜ planned

## v0.1 — Foundation
- ✅ Monorepo (pnpm) + TypeScript strict + base configs
- ✅ `@opdicom/parser` — DICOM Part-10 metadata parser
- ✅ `@opdicom/core` — headless engine on Cornerstone3D (stack viewport)
- ✅ `@opdicom/viewer` — `<opdicom-viewer>` Web Component (Lit)
- ✅ MVP: load DICOM, window/level, zoom/pan
- ✅ Vitest unit tests + coverage thresholds
- ✅ Security: SECURITY.md, CodeQL, Dependabot, audit in CI, dep overrides
- ✅ CI (typecheck/test/build, Node 20/22) + branch protection

## v0.2 — Navigation & measurements ✅
- ✅ **Series / stack scroll** — wheel + keyboard (↑/↓/←/→, PgUp/PgDn, Home/End),
  programmatic `setImageIndex`/`scrollStack`, slice indicator (`n / total`),
  `opdicom-slice` event
- ✅ **Measurements** — Length, Angle, Rectangle ROI, Elliptical ROI, Probe
  (ROIs surface area + pixel/HU statistics from Cornerstone)
- ✅ Clear-measurements action (`clearMeasurements()` + toolbar button)
- ✅ Cine playback — play/pause + fps control for multi-image series
  (`play`/`pause`/`togglePlay`/`isPlaying`, clamped frame rate)

## v0.3 — Export & interop ✅
- ✅ Export viewport to PNG/JPEG (`exportImage`/`downloadImage` + toolbar button)
- ✅ Export annotated capture (burned-in SVG overlays via `captureToCanvas`)
- ✅ Download original DICOM of the current instance (`downloadCurrentDicom`)
- ✅ DICOMweb: WADO-RS (retrieve) + QIDO-RS (query) — built-in fetch client,
  `loadFromDicomWeb`; see [docs/CONNECTIVITY.md](./docs/CONNECTIVITY.md)
- ✅ E2E tests (Playwright) — real-browser render/tool/export validation

## v0.4 — Framework wrappers
- ⬜ `@opdicom/react`
- ⬜ `@opdicom/vue`
- ⬜ `@opdicom/angular`
- ⬜ Live docs site + hosted demo (GitHub Pages)

## v0.5 — Advanced rendering
- ⬜ MPR (multiplanar reconstruction)
- ⬜ 3D volume rendering / MIP
- ⬜ Segmentation overlays
- ⬜ WebGPU rendering path

## v0.3.x — Viewer parity (dwv-inspired) 🚧
- ✅ Corner metadata overlays (patient/study/series) + W/L + zoom + slice
- ✅ Cursor readout: image (i,j), pixel value, world position (mm)
- ✅ Colormaps (pseudo-color: Hot/Jet/Cool-to-Warm/Rainbow) + smoothing toggle
- ✅ Drawing tools (freehand, arrow, circle ROI, bidirectional, Cobb angle)
- ✅ Multi-view layout (1x1 / 2x1 / 1x2 / 2x2) with zoom/pan/VOI/scroll sync —
  all cells share one RenderingEngine (no context-pool exhaustion)
- ⬜ Segmentation (labelmap: brush, floodfill, livewire) — needs labelmap infra
- ⬜ True MPR (axial/sagittal/coronal reslice) — needs volume viewports; the
  shared-engine/multi-viewport groundwork is now in place

## Cross-cutting (ongoing)
- ✅ i18n (en/es) for the Web Component UI + in-toolbar language selector
- ⬜ Theming presets (light/dark/high-contrast) + docs for CSS custom props
- ⬜ Accessibility pass (keyboard, ARIA, focus management)
- ⬜ Performance: large series, progressive loading, web worker tuning
- ✅ E2E tests (Playwright) with a synthetic in-repo DICOM (no PHI/network)
- ⬜ Publish packages to npm (Changesets release flow)
