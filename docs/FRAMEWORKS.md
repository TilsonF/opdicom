# Using OpDICOM in React, Vue and Angular

`<opdicom-viewer>` is a standard Web Component, so it works in any framework.
Thin wrappers add typed props/events for React and Vue; Angular consumes the
element directly.

## React — `@opdicom/react`

```bash
npm i @opdicom/react react
```

```tsx
import { useRef } from "react";
import { OpdicomViewer, type OpdicomViewerHandle } from "@opdicom/react";

export function Study({ files }: { files: File[] }) {
  const ref = useRef<OpdicomViewerHandle>(null);
  return (
    <OpdicomViewer
      ref={ref}
      locale="en"
      layout="2x1"
      style={{ width: "100%", height: 600 }}
      onLoad={(d) => console.log("loaded", d.metadata)}
      onSlice={(s) => console.log(`${s.index + 1}/${s.count}`)}
    />
  );
  // ref.current?.loadFiles(files);  // imperative API on the element
}
```

## Vue 3 — `@opdicom/vue`

```bash
npm i @opdicom/vue vue
```

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { OpdicomViewer } from "@opdicom/vue";

const viewer = ref();
onMounted(() => {/* viewer.value.element.loadFiles(files) */});
</script>

<template>
  <OpdicomViewer
    ref="viewer"
    locale="es"
    layout="2x2"
    style="width: 100%; height: 600px"
    @load="(d) => console.log(d)"
    @slice="(s) => console.log(s)"
  />
</template>
```

If you prefer the raw element in a Vue SFC, mark it as a custom element in your
build (`vite.config`):

```ts
vue({ template: { compilerOptions: { isCustomElement: (t) => t.startsWith("opdicom-") } } })
```

## Angular

Angular consumes the Web Component directly — no wrapper package needed. Import
the element once and allow custom elements in the module/component:

```ts
import "@opdicom/viewer";
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from "@angular/core";

@Component({
  standalone: true,
  selector: "app-study",
  template: `<opdicom-viewer #v locale="en" layout="1x1"
              style="width:100%;height:600px"></opdicom-viewer>`,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class StudyComponent {
  @ViewChild("v") viewer!: ElementRef<HTMLElement & { loadFiles(f: File[]): Promise<unknown> }>;
  load(files: File[]) {
    this.viewer.nativeElement.loadFiles(files);
  }
}
```

Bind events with Angular's `(opdicom-load)` / `(opdicom-slice)` host listeners or
`addEventListener` on `nativeElement`.

## Plain HTML / any framework

```html
<script type="module" src="https://cdn.example.com/opdicom-viewer.js"></script>
<opdicom-viewer style="width:100%;height:600px"></opdicom-viewer>
<script type="module">
  document.querySelector("opdicom-viewer").loadFiles(myFileList);
</script>
```
