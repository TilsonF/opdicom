/**
 * Builds a complete, renderable DICOM Part-10 file (Explicit VR Little Endian,
 * uncompressed) with real 16-bit MONOCHROME2 pixel data — enough for
 * Cornerstone3D to decode and display without any WASM codec. Used by the E2E
 * tests so they never depend on patient data or network access.
 */

const SHORT_VRS = new Set([
  "AE", "AS", "AT", "CS", "DA", "DS", "DT", "FL", "FD", "IS", "LO", "LT",
  "PN", "SH", "SL", "SS", "ST", "TM", "UI", "UL", "US",
]);

interface El {
  group: number;
  element: number;
  vr: string;
  value: string | Uint8Array;
}

function enc(vr: string, value: string | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (vr === "US") {
    const parts = value.split("\\").filter(Boolean);
    const b = new Uint8Array(parts.length * 2);
    const dv = new DataView(b.buffer);
    parts.forEach((p, i) => dv.setUint16(i * 2, Number(p), true));
    return b;
  }
  const bytes = new TextEncoder().encode(value);
  if (bytes.length % 2 === 0) return bytes;
  const out = new Uint8Array(bytes.length + 1);
  out.set(bytes);
  out[bytes.length] = vr === "UI" ? 0x00 : 0x20;
  return out;
}

function element(el: El): Uint8Array {
  const v = enc(el.vr, el.value);
  const vr = new TextEncoder().encode(el.vr);
  const short = SHORT_VRS.has(el.vr);
  const out = new Uint8Array((short ? 8 : 12) + v.length);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, el.group, true);
  dv.setUint16(2, el.element, true);
  out[4] = vr[0]!;
  out[5] = vr[1]!;
  if (short) {
    dv.setUint16(6, v.length, true);
    out.set(v, 8);
  } else {
    dv.setUint32(8, v.length, true);
    out.set(v, 12);
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

export function makeRenderableDicom(rows = 64, columns = 64): Uint8Array {
  // 16-bit diagonal gradient so the rendered image is clearly non-blank.
  const pixels = new Uint8Array(rows * columns * 2);
  const pv = new DataView(pixels.buffer);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const value = Math.round(((r + c) / (rows + columns)) * 4095);
      pv.setUint16((r * columns + c) * 2, value, true);
    }
  }

  const metaEls: El[] = [
    { group: 0x0002, element: 0x0002, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0002, element: 0x0003, vr: "UI", value: "1.2.826.0.1.3680043.8.1.1" },
    { group: 0x0002, element: 0x0010, vr: "UI", value: "1.2.840.10008.1.2.1" },
  ];
  const metaBody = concat(metaEls.map(element));
  const groupLen = element({
    group: 0x0002,
    element: 0x0000,
    vr: "UL",
    value: (() => {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setUint32(0, metaBody.length, true);
      return b;
    })(),
  });

  const dataEls: El[] = [
    { group: 0x0008, element: 0x0016, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0008, element: 0x0018, vr: "UI", value: "1.2.826.0.1.3680043.8.1.2" },
    { group: 0x0008, element: 0x0060, vr: "CS", value: "OT" },
    { group: 0x0008, element: 0x103e, vr: "LO", value: "OpDICOM E2E" },
    { group: 0x0010, element: 0x0010, vr: "PN", value: "E2E^TEST" },
    { group: 0x0020, element: 0x000d, vr: "UI", value: "1.2.826.0.1.3680043.8.3" },
    { group: 0x0020, element: 0x000e, vr: "UI", value: "1.2.826.0.1.3680043.8.4" },
    { group: 0x0020, element: 0x0013, vr: "IS", value: "1" },
    { group: 0x0028, element: 0x0002, vr: "US", value: "1" },
    { group: 0x0028, element: 0x0004, vr: "CS", value: "MONOCHROME2" },
    { group: 0x0028, element: 0x0010, vr: "US", value: String(rows) },
    { group: 0x0028, element: 0x0011, vr: "US", value: String(columns) },
    { group: 0x0028, element: 0x0100, vr: "US", value: "16" },
    { group: 0x0028, element: 0x0101, vr: "US", value: "16" },
    { group: 0x0028, element: 0x0102, vr: "US", value: "15" },
    { group: 0x0028, element: 0x0103, vr: "US", value: "0" },
    { group: 0x0028, element: 0x1050, vr: "DS", value: "2048" },
    { group: 0x0028, element: 0x1051, vr: "DS", value: "4096" },
    { group: 0x7fe0, element: 0x0010, vr: "OW", value: pixels },
  ];
  const dataBody = concat(dataEls.map(element));

  const preamble = new Uint8Array(128);
  const magic = new TextEncoder().encode("DICM");
  return concat([preamble, magic, groupLen, metaBody, dataBody]);
}

/** Base64 of a renderable DICOM, for passing into the browser context. */
export function makeRenderableDicomBase64(rows = 64, columns = 64): string {
  return Buffer.from(makeRenderableDicom(rows, columns)).toString("base64");
}
