import "@opdicom/viewer";
import type { OpdicomViewer as OpdicomViewerElement } from "@opdicom/viewer";
import { defineComponent, h, onMounted, onBeforeUnmount, ref, watch } from "vue";

/**
 * Vue 3 wrapper around `<opdicom-viewer>`. Forwards props, emits `load`,
 * `error` and `slice`, and exposes the underlying element (call `loadFiles`,
 * `setPrimaryTool`, … on it via a template ref + `.element`).
 */
export const OpdicomViewer = defineComponent({
  name: "OpdicomViewer",
  props: {
    locale: { type: String, default: undefined },
    layout: { type: String, default: undefined },
    noToolbar: { type: Boolean, default: false },
    noDnd: { type: Boolean, default: false },
  },
  emits: ["load", "error", "slice"],
  setup(props, { emit, expose }) {
    const elRef = ref<OpdicomViewerElement | null>(null);

    const onLoad = (e: Event) => emit("load", (e as CustomEvent).detail);
    const onError = (e: Event) => emit("error", (e as CustomEvent).detail?.error);
    const onSlice = (e: Event) => emit("slice", (e as CustomEvent).detail);

    onMounted(() => {
      const el = elRef.value;
      if (!el) return;
      if (props.locale) el.locale = props.locale as "en" | "es";
      if (props.layout) el.layout = props.layout as OpdicomViewerElement["layout"];
      el.addEventListener("opdicom-load", onLoad);
      el.addEventListener("opdicom-error", onError);
      el.addEventListener("opdicom-slice", onSlice);
    });

    onBeforeUnmount(() => {
      const el = elRef.value;
      if (!el) return;
      el.removeEventListener("opdicom-load", onLoad);
      el.removeEventListener("opdicom-error", onError);
      el.removeEventListener("opdicom-slice", onSlice);
    });

    watch(
      () => props.locale,
      (v) => {
        if (elRef.value && v) elRef.value.locale = v as "en" | "es";
      },
    );
    watch(
      () => props.layout,
      (v) => {
        if (elRef.value && v)
          elRef.value.layout = v as OpdicomViewerElement["layout"];
      },
    );

    expose({
      get element() {
        return elRef.value;
      },
    });

    return () =>
      h("opdicom-viewer", {
        ref: elRef,
        "no-toolbar": props.noToolbar ? "" : undefined,
        "no-dnd": props.noDnd ? "" : undefined,
      });
  },
});

export default OpdicomViewer;
