/**
 * DICOMweb helpers — pure URL/metadata utilities plus a small fetch-based
 * client for QIDO-RS (query) and WADO-RS (retrieve). No external dependency:
 * the client uses the platform `fetch` (injectable for testing).
 */

/** DICOM JSON tag keys (8-char uppercase hex, no leading 'x'). */
export const DwTag = {
  StudyInstanceUID: "0020000D",
  SeriesInstanceUID: "0020000E",
  SOPInstanceUID: "00080018",
  InstanceNumber: "00200013",
  SeriesNumber: "00200011",
  Modality: "00080060",
  NumberOfFrames: "00280008",
  SeriesDescription: "0008103E",
  StudyDescription: "00081030",
} as const;

/** A DICOM JSON attribute: `{ vr, Value: [...] }`. */
export interface DicomJsonElement {
  vr?: string;
  Value?: unknown[];
}

/** A DICOM JSON dataset: tag -> element. */
export type DicomJsonDataset = Record<string, DicomJsonElement | undefined>;

/** First raw value of a DICOM JSON attribute. */
export function dwValue(dataset: DicomJsonDataset, tag: string): unknown {
  return dataset[tag]?.Value?.[0];
}

/** First value of a DICOM JSON attribute as a string. */
export function dwString(
  dataset: DicomJsonDataset,
  tag: string,
): string | undefined {
  const v = dwValue(dataset, tag);
  if (v === undefined || v === null) return undefined;
  // PersonName values are objects like { Alphabetic: "DOE^JOHN" }.
  if (typeof v === "object" && "Alphabetic" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>).Alphabetic);
  }
  return String(v);
}

/** First value of a DICOM JSON attribute as a number. */
export function dwNumber(
  dataset: DicomJsonDataset,
  tag: string,
): number | undefined {
  const v = dwValue(dataset, tag);
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Strip trailing slashes from a root URL (linear scan; no ReDoS). */
export function trimRoot(root: string): string {
  let end = root.length;
  while (end > 0 && root[end - 1] === "/") end--;
  return root.slice(0, end);
}

export interface WadoRsImageIdParts {
  wadoRsRoot: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  /** 1-based frame number. Default 1. */
  frame?: number;
}

/** Build a Cornerstone `wadors:` imageId for a single frame. */
export function buildWadoRsImageId(parts: WadoRsImageIdParts): string {
  const frame = parts.frame ?? 1;
  const root = trimRoot(parts.wadoRsRoot);
  return (
    `wadors:${root}/studies/${parts.studyInstanceUID}` +
    `/series/${parts.seriesInstanceUID}` +
    `/instances/${parts.sopInstanceUID}/frames/${frame}`
  );
}

/** Sort instance metadata ascending by InstanceNumber (stable, missing last). */
export function sortInstanceMetadata<T extends DicomJsonDataset>(
  instances: readonly T[],
): T[] {
  return [...instances].sort((a, b) => {
    const na = dwNumber(a, DwTag.InstanceNumber);
    const nb = dwNumber(b, DwTag.InstanceNumber);
    if (na === undefined && nb === undefined) return 0;
    if (na === undefined) return 1;
    if (nb === undefined) return -1;
    return na - nb;
  });
}

export interface DicomWebConfig {
  /** WADO-RS base, e.g. "https://server/dicom-web". */
  wadoRsRoot: string;
  /** QIDO-RS base; defaults to `wadoRsRoot`. */
  qidoRsRoot?: string;
  /** Extra headers (auth tokens, etc.). */
  headers?: Record<string, string>;
  /** Injectable fetch (defaults to the global). */
  fetchImpl?: typeof fetch;
}

/** A single DICOM series identified for retrieval. */
export interface SeriesQuery {
  studyInstanceUID: string;
  seriesInstanceUID: string;
}

/**
 * Minimal DICOMweb client. Implements the QIDO-RS searches and the WADO-RS
 * series-metadata retrieval needed to drive the viewer. Requests negotiate
 * `application/dicom+json`.
 */
export class DicomWebClient {
  private readonly wadoRoot: string;
  private readonly qidoRoot: string;
  private readonly headers: Record<string, string>;
  private readonly doFetch: typeof fetch;

  constructor(config: DicomWebConfig) {
    if (!config.wadoRsRoot) throw new Error("DicomWebClient: wadoRsRoot required");
    this.wadoRoot = trimRoot(config.wadoRsRoot);
    this.qidoRoot = trimRoot(config.qidoRsRoot ?? config.wadoRsRoot);
    this.headers = { Accept: "application/dicom+json", ...config.headers };
    const f = config.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error("DicomWebClient: no fetch implementation available");
    this.doFetch = f.bind(globalThis);
  }

  private async getJson(url: string): Promise<DicomJsonDataset[]> {
    const res = await this.doFetch(url, { headers: this.headers });
    if (!res.ok) {
      throw new Error(`DICOMweb request failed: ${res.status} ${res.statusText} (${url})`);
    }
    // 204 No Content (empty QIDO result) -> [].
    if (res.status === 204) return [];
    const data = (await res.json()) as DicomJsonDataset[];
    return Array.isArray(data) ? data : [];
  }

  private query(params?: Record<string, string | number>): string {
    if (!params) return "";
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) usp.set(k, String(v));
    const s = usp.toString();
    return s ? `?${s}` : "";
  }

  /** QIDO-RS: search studies. */
  searchForStudies(params?: Record<string, string | number>): Promise<DicomJsonDataset[]> {
    return this.getJson(`${this.qidoRoot}/studies${this.query(params)}`);
  }

  /** QIDO-RS: search series within a study. */
  searchForSeries(
    studyInstanceUID: string,
    params?: Record<string, string | number>,
  ): Promise<DicomJsonDataset[]> {
    return this.getJson(
      `${this.qidoRoot}/studies/${studyInstanceUID}/series${this.query(params)}`,
    );
  }

  /** QIDO-RS: search instances within a series. */
  searchForInstances(
    studyInstanceUID: string,
    seriesInstanceUID: string,
    params?: Record<string, string | number>,
  ): Promise<DicomJsonDataset[]> {
    return this.getJson(
      `${this.qidoRoot}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances${this.query(params)}`,
    );
  }

  /** WADO-RS: retrieve the per-instance metadata for a series. */
  retrieveSeriesMetadata(query: SeriesQuery): Promise<DicomJsonDataset[]> {
    return this.getJson(
      `${this.wadoRoot}/studies/${query.studyInstanceUID}/series/${query.seriesInstanceUID}/metadata`,
    );
  }
}
