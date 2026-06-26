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

## v0.3 — Export & interop 🚧
- ✅ Export viewport to PNG/JPEG (`exportImage`/`downloadImage` + toolbar button)
- ✅ Export annotated capture (burned-in SVG overlays via `captureToCanvas`)
- ⬜ Export/download DICOM
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

## Cross-cutting (ongoing)
- ⬜ Theming presets (light/dark/high-contrast) + docs for CSS custom props
- ⬜ Accessibility pass (keyboard, ARIA, focus management)
- ⬜ Performance: large series, progressive loading, web worker tuning
- ✅ E2E tests (Playwright) with a synthetic in-repo DICOM (no PHI/network)
- ⬜ Publish packages to npm (Changesets release flow)
