<div align="center">

# OpDICOM

**A modern, zero-footprint, framework-agnostic DICOM web viewer**
**+ a high-performance DICOM medical image parser.**

Built on [Cornerstone3D](https://www.cornerstonejs.org/) · TypeScript · Web Components · GPU rendering

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

</div>

> ⚠️ **Not a medical device.** OpDICOM is open-source software for research, education
> and development. It is **not** cleared/approved for primary diagnosis. Do not use it as
> the sole basis for clinical decisions.

## Why OpDICOM?

The medical-imaging web stack is powerful but hard to embed. OpDICOM is the thin, modern,
**embeddable** layer on top of the industry-standard rendering engine:

- 🧩 **Drop-in Web Component** — `<opdicom-viewer>` works in React, Vue, Angular, Svelte or plain HTML.
- ⚡ **GPU-accelerated** — pan/zoom, window/level, cine, measurements via Cornerstone3D (WebGL2 → WebGPU).
- 📦 **Zero-footprint** — everything runs client-side. Patient data never leaves the browser.
- 🚀 **High-performance parser** — `@opdicom/parser` extracts metadata fast, streaming-friendly.
- 📱 **Multi-device** — phones, desktops, kiosks/TV. Touch gestures + keyboard.
- 🎨 **Customizable** — theming via CSS custom properties, configurable toolbar, plugin tools.
- 🔒 **Secure by design** — no telemetry, CSP-friendly, optional anonymization.

## Packages

| Package | Description |
| --- | --- |
| [`@opdicom/parser`](./packages/parser) | High-performance DICOM medical image parser (metadata + tags). |
| [`@opdicom/core`](./packages/core) | Headless, framework-agnostic viewer engine over Cornerstone3D. |
| [`@opdicom/viewer`](./packages/viewer) | `<opdicom-viewer>` Web Component (Lit). |
| [`apps/demo`](./apps/demo) | Vite playground / reference integration. |

## Quick start (dev)

```bash
# Node >= 20, pnpm >= 9
pnpm install
pnpm dev        # opens the demo playground
```

Then drag & drop a `.dcm` file onto the viewer.

## Use the Web Component

```html
<script type="module" src="https://cdn.example.com/opdicom-viewer.js"></script>

<opdicom-viewer style="width: 100%; height: 600px"></opdicom-viewer>

<script type="module">
  const viewer = document.querySelector('opdicom-viewer');
  await viewer.loadFiles(myFileList);   // File[] | URLs | DICOMweb
</script>
```

### In React

```tsx
import '@opdicom/viewer';

export function Study({ files }: { files: File[] }) {
  const ref = useRef<HTMLElement & { loadFiles(f: File[]): Promise<void> }>(null);
  useEffect(() => { ref.current?.loadFiles(files); }, [files]);
  return <opdicom-viewer ref={ref} style={{ width: '100%', height: 600 }} />;
}
```

## Roadmap

- [x] Monorepo + MVP: load a DICOM, window/level, zoom/pan
- [ ] Series / stack scrolling + cine
- [ ] Measurements (length, angle, ROI with HU stats)
- [ ] Export PNG / DICOM / annotated capture
- [ ] DICOMweb (WADO-RS / QIDO-RS)
- [ ] React / Vue / Angular wrapper packages
- [ ] MPR + 3D / MIP
- [ ] WebGPU rendering path

See [the full design](./docs/ARCHITECTURE.md) (coming soon).

## Contributing

Contributions welcome! Read [CONTRIBUTING.md](./CONTRIBUTING.md) and our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © OpDICOM contributors. Built on the excellent
[Cornerstone3D](https://github.com/cornerstonejs/cornerstone3D) ecosystem.
