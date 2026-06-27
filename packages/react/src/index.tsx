import "@opdicom/viewer";
import type { OpdicomViewer as OpdicomViewerElement } from "@opdicom/viewer";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type DetailedHTMLProps,
  type HTMLAttributes,
} from "react";

export interface OpdicomViewerProps {
  /** UI language. */
  locale?: "en" | "es";
  /** Grid layout. */
  layout?: "1x1" | "2x1" | "1x2" | "2x2";
  /** Hide the built-in toolbar. */
  noToolbar?: boolean;
  /** Disable drag & drop loading. */
  noDnd?: boolean;
  /** Fired after files / imageIds load. */
  onLoad?: (detail: { imageIds: string[]; metadata: unknown[] }) => void;
  /** Fired on a load/render error. */
  onError?: (error: unknown) => void;
  /** Fired when the displayed slice changes. */
  onSlice?: (detail: { index: number; count: number }) => void;
  style?: CSSProperties;
  className?: string;
}

/** Imperative handle exposing the underlying element and its methods. */
export type OpdicomViewerHandle = OpdicomViewerElement;

/**
 * Thin React wrapper around `<opdicom-viewer>`. Forwards props as element
 * attributes/properties, binds custom events to callbacks, and exposes the
 * element via ref so you can call `loadFiles`, `setPrimaryTool`, etc.
 */
export const OpdicomViewer = forwardRef<
  OpdicomViewerHandle,
  OpdicomViewerProps
>(function OpdicomViewer(props, ref) {
  const elRef = useRef<OpdicomViewerElement | null>(null);
  const { locale, layout, noToolbar, noDnd, onLoad, onError, onSlice, style, className } = props;

  useImperativeHandle(ref, () => elRef.current as OpdicomViewerHandle, []);

  // Reflect properties (Lit reads these as properties, not just attributes).
  useEffect(() => {
    if (elRef.current && locale) elRef.current.locale = locale;
  }, [locale]);
  useEffect(() => {
    if (elRef.current && layout) elRef.current.layout = layout;
  }, [layout]);

  // Bind custom events.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const load = (e: Event) => onLoad?.((e as CustomEvent).detail);
    const error = (e: Event) => onError?.((e as CustomEvent).detail?.error);
    const slice = (e: Event) => onSlice?.((e as CustomEvent).detail);
    el.addEventListener("opdicom-load", load);
    el.addEventListener("opdicom-error", error);
    el.addEventListener("opdicom-slice", slice);
    return () => {
      el.removeEventListener("opdicom-load", load);
      el.removeEventListener("opdicom-error", error);
      el.removeEventListener("opdicom-slice", slice);
    };
  }, [onLoad, onError, onSlice]);

  return (
    <opdicom-viewer
      ref={elRef as never}
      no-toolbar={noToolbar ? "" : undefined}
      no-dnd={noDnd ? "" : undefined}
      style={style}
      class={className}
    />
  );
});

type OpdicomElementProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  "no-toolbar"?: string;
  "no-dnd"?: string;
  class?: string;
};

// React 19 resolves intrinsic elements via the `react` module's JSX namespace.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "opdicom-viewer": OpdicomElementProps;
    }
  }
}
