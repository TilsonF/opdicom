/**
 * Minimal DICOM Part-10 file builder (Explicit VR Little Endian) for tests.
 * Produces real byte streams so the parser is exercised end-to-end rather than
 * against a mock. Not a general-purpose writer — just enough for unit tests.
 */

const SHORT_LENGTH_VRS = new Set([
  "AE", "AS", "AT", "CS", "DA", "DS", "DT", "FL", "FD", "IS", "LO", "LT",
  "PN", "SH", "SL", "SS", "ST", "TM", "UI", "UL", "US",
]);

type Vr = string;

interface Element {
  group: number;
  element: number;
  vr: Vr;
  /** String value (multi-valued joined by "\\") or raw bytes. */
  value: string | Uint8Array;
}

function encodeValue(vr: Vr, value: string | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (vr === "US") {
    const parts = value.split("\\").filter((s) => s.length);
    const buf = new Uint8Array(parts.length * 2);
    const view = new DataView(buf.buffer);
    parts.forEach((p, i) => view.setUint16(i * 2, Number(p), true));
    return buf;
  }
  // String VRs: ASCII, pad to even length (UI pads with NUL, others space).
  const bytes = new TextEncoder().encode(value);
  if (bytes.length % 2 === 0) return bytes;
  const pad = vr === "UI" ? 0x00 : 0x20;
  const out = new Uint8Array(bytes.length + 1);
  out.set(bytes);
  out[bytes.length] = pad;
  return out;
}

function encodeElement(el: Element): Uint8Array {
  const valueBytes = encodeValue(el.vr, el.value);
  const vrBytes = new TextEncoder().encode(el.vr);
  const useShort = SHORT_LENGTH_VRS.has(el.vr);
  const headerLen = useShort ? 8 : 12;
  const out = new Uint8Array(headerLen + valueBytes.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, el.group, true);
  view.setUint16(2, el.element, true);
  out[4] = vrBytes[0]!;
  out[5] = vrBytes[1]!;
  if (useShort) {
    view.setUint16(6, valueBytes.length, true);
    out.set(valueBytes, 8);
  } else {
    // reserved 2 bytes (already 0) + 4-byte length
    view.setUint32(8, valueBytes.length, true);
    out.set(valueBytes, 12);
  }
  return out;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export interface FixtureOptions {
  patientName?: string;
  patientId?: string;
  modality?: string;
  rows?: number;
  columns?: number;
  pixelSpacing?: string;
  windowCenter?: string;
  windowWidth?: string;
  rescaleSlope?: string;
  rescaleIntercept?: string;
  pixelRepresentation?: number;
}

/** Build a valid in-memory DICOM Part-10 buffer with the given attributes. */
export function makeDicom(opts: FixtureOptions = {}): Uint8Array {
  const {
    patientName = "DOE^JOHN",
    patientId = "PID-001",
    modality = "CT",
    rows = 256,
    columns = 256,
    pixelSpacing = "0.5\\0.6",
    windowCenter = "40\\-600",
    windowWidth = "400\\1500",
    rescaleSlope = "1",
    rescaleIntercept = "-1024",
    pixelRepresentation = 0,
  } = opts;

  // ---- File meta group (0002), always Explicit VR LE -----------------------
  const metaElements: Element[] = [
    { group: 0x0002, element: 0x0002, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.2" },
    { group: 0x0002, element: 0x0003, vr: "UI", value: "1.2.3.4.5.6.7.8.9.0" },
    { group: 0x0002, element: 0x0010, vr: "UI", value: "1.2.840.10008.1.2.1" }, // Explicit VR LE
  ];
  const metaBody = concat(metaElements.map(encodeElement));

  // (0002,0000) Group Length UL = byte length of the meta elements that follow.
  const groupLength = encodeElement({
    group: 0x0002,
    element: 0x0000,
    vr: "UL",
    value: (() => {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setUint32(0, metaBody.length, true);
      return b;
    })(),
  });

  // ---- Main dataset (Explicit VR LE) ---------------------------------------
  const dataElements: Element[] = [
    { group: 0x0008, element: 0x0060, vr: "CS", value: modality },
    { group: 0x0008, element: 0x0018, vr: "UI", value: "1.2.3.4.5.6.7.8.9.1" },
    { group: 0x0010, element: 0x0010, vr: "PN", value: patientName },
    { group: 0x0010, element: 0x0020, vr: "LO", value: patientId },
    { group: 0x0020, element: 0x000d, vr: "UI", value: "1.2.3.4.5.6.7.8.10" },
    { group: 0x0020, element: 0x000e, vr: "UI", value: "1.2.3.4.5.6.7.8.11" },
    { group: 0x0020, element: 0x0013, vr: "IS", value: "1" },
    { group: 0x0028, element: 0x0010, vr: "US", value: String(rows) },
    { group: 0x0028, element: 0x0011, vr: "US", value: String(columns) },
    { group: 0x0028, element: 0x0030, vr: "DS", value: pixelSpacing },
    { group: 0x0028, element: 0x0103, vr: "US", value: String(pixelRepresentation) },
    { group: 0x0028, element: 0x1050, vr: "DS", value: windowCenter },
    { group: 0x0028, element: 0x1051, vr: "DS", value: windowWidth },
    { group: 0x0028, element: 0x1052, vr: "DS", value: rescaleIntercept },
    { group: 0x0028, element: 0x1053, vr: "DS", value: rescaleSlope },
  ];
  const dataBody = concat(dataElements.map(encodeElement));

  // ---- Preamble (128 zero bytes) + "DICM" magic ----------------------------
  const preamble = new Uint8Array(128);
  const magic = new TextEncoder().encode("DICM");

  return concat([preamble, magic, groupLength, metaBody, dataBody]);
}
