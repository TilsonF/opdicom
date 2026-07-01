/**
 * View plain web images (PNG/JPEG/…) by wrapping their pixels in a minimal
 * DICOM (RGB, 8-bit) in the browser. This reuses the whole proven DICOM
 * pipeline instead of adding a separate image loader/metadata provider.
 *
 * This module is pure (unit-tested). The browser part that rasterizes an image
 * to pixels lives in web-image-loader.ts.
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

function encValue(vr: string, value: string | Uint8Array): Uint8Array {
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

function encodeElement(el: El): Uint8Array {
  const v = encValue(el.vr, el.value);
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
    dv.setUint32(8, v.length, true); // OB/OW/etc: 2 reserved (0) + 4-byte length
    out.set(v, 12);
  }
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

let uidCounter = 0;
function uid(branch: number): string {
  return `1.2.826.0.1.3680043.8.20.${branch}.${++uidCounter}`;
}

/** Whether a byte buffer starts with the DICOM Part-10 preamble ("DICM"@128). */
export function hasDicomMagic(head: Uint8Array): boolean {
  return (
    head.length >= 132 &&
    head[128] === 0x44 && // D
    head[129] === 0x49 && // I
    head[130] === 0x43 && // C
    head[131] === 0x4d // M
  );
}

/** Whether a MIME type / filename looks like a plain web image. */
export function isWebImageType(type: string | undefined, name: string | undefined): boolean {
  if (type && type.startsWith("image/") && type !== "image/dicom") return true;
  return /\.(png|jpe?g|gif|bmp|webp)$/i.test(name ?? "");
}

/**
 * Build a minimal RGB (8-bit, MONOCHROME→RGB) DICOM Part-10 buffer from tightly
 * packed RGB pixel bytes (length = rows*columns*3).
 */
export function encodeRgbDicom(
  rgb: Uint8Array,
  rows: number,
  columns: number,
): Uint8Array {
  const metaEls: El[] = [
    { group: 0x0002, element: 0x0002, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0002, element: 0x0003, vr: "UI", value: uid(1) },
    { group: 0x0002, element: 0x0010, vr: "UI", value: "1.2.840.10008.1.2.1" },
  ];
  const metaBody = concatBytes(metaEls.map(encodeElement));
  const groupLen = encodeElement({
    group: 0x0002,
    element: 0x0000,
    vr: "UL",
    value: (() => {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setUint32(0, metaBody.length, true);
      return b;
    })(),
  });

  // PixelData (OB) must be even-length.
  const pixels =
    rgb.length % 2 === 0
      ? rgb
      : (() => {
          const p = new Uint8Array(rgb.length + 1);
          p.set(rgb);
          return p;
        })();

  const dataEls: El[] = [
    { group: 0x0008, element: 0x0016, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0008, element: 0x0018, vr: "UI", value: uid(2) },
    { group: 0x0008, element: 0x0060, vr: "CS", value: "OT" },
    { group: 0x0008, element: 0x103e, vr: "LO", value: "Imported image" },
    { group: 0x0020, element: 0x000d, vr: "UI", value: uid(3) },
    { group: 0x0020, element: 0x000e, vr: "UI", value: uid(4) },
    { group: 0x0028, element: 0x0002, vr: "US", value: "3" },
    { group: 0x0028, element: 0x0004, vr: "CS", value: "RGB" },
    { group: 0x0028, element: 0x0006, vr: "US", value: "0" },
    { group: 0x0028, element: 0x0010, vr: "US", value: String(rows) },
    { group: 0x0028, element: 0x0011, vr: "US", value: String(columns) },
    { group: 0x0028, element: 0x0100, vr: "US", value: "8" },
    { group: 0x0028, element: 0x0101, vr: "US", value: "8" },
    { group: 0x0028, element: 0x0102, vr: "US", value: "7" },
    { group: 0x0028, element: 0x0103, vr: "US", value: "0" },
    { group: 0x7fe0, element: 0x0010, vr: "OB", value: pixels },
  ];
  const dataBody = concatBytes(dataEls.map(encodeElement));

  const preamble = new Uint8Array(128);
  const magic = new TextEncoder().encode("DICM");
  return concatBytes([preamble, magic, groupLen, metaBody, dataBody]);
}
