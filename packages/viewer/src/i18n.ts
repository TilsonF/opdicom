/**
 * Tiny i18n for the Web Component UI. Pure and dependency-free so it can be
 * unit-tested without the DOM. English is the source/fallback language.
 */

export type Lang = "en" | "es";

export const LANGS: readonly Lang[] = ["en", "es"];

/** UI string keys used by the viewer. */
export type MessageKey =
  | "windowLevel"
  | "zoom"
  | "pan"
  | "scroll"
  | "length"
  | "angle"
  | "rectangleRoi"
  | "ellipticalRoi"
  | "probe"
  | "preset"
  | "clear"
  | "reset"
  | "exportPng"
  | "exportDicom"
  | "play"
  | "pause"
  | "fps"
  | "language"
  | "overlay"
  | "colormap"
  | "smoothing"
  | "dropHint"
  | "loading";

type Messages = Record<MessageKey, string>;

const en: Messages = {
  windowLevel: "W/L",
  zoom: "Zoom",
  pan: "Pan",
  scroll: "Scroll",
  length: "Length",
  angle: "Angle",
  rectangleRoi: "Rect ROI",
  ellipticalRoi: "Ellipse ROI",
  probe: "Probe",
  preset: "Preset…",
  clear: "Clear",
  reset: "Reset",
  exportPng: "⬇ PNG",
  exportDicom: "⬇ DICOM",
  play: "Play",
  pause: "Pause",
  fps: "fps",
  language: "Language",
  overlay: "Overlay",
  colormap: "Colormap…",
  smoothing: "Smooth",
  dropHint: "Drop a DICOM file here, or use loadFiles().",
  loading: "Loading…",
};

const es: Messages = {
  windowLevel: "V/N",
  zoom: "Zoom",
  pan: "Paneo",
  scroll: "Desplazar",
  length: "Longitud",
  angle: "Ángulo",
  rectangleRoi: "ROI rect.",
  ellipticalRoi: "ROI elipse",
  probe: "Sonda",
  preset: "Preajuste…",
  clear: "Limpiar",
  reset: "Restablecer",
  exportPng: "⬇ PNG",
  exportDicom: "⬇ DICOM",
  play: "Reproducir",
  pause: "Pausa",
  fps: "fps",
  language: "Idioma",
  overlay: "Sobrecapa",
  colormap: "Mapa de color…",
  smoothing: "Suavizar",
  dropHint: "Arrastra un archivo DICOM aquí, o usa loadFiles().",
  loading: "Cargando…",
};

export const TRANSLATIONS: Record<Lang, Messages> = { en, es };

/** Map any BCP-47-ish string (e.g. "es-CO", navigator.language) to a Lang. */
export function resolveLang(input: string | undefined | null): Lang {
  if (input && input.toLowerCase().startsWith("es")) return "es";
  return "en";
}

/** Translate a key, falling back to English then the key itself. */
export function t(lang: Lang, key: MessageKey): string {
  return TRANSLATIONS[lang]?.[key] ?? en[key] ?? key;
}
