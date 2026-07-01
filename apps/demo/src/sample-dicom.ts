/**
 * Generates a synthetic, renderable DICOM (Explicit VR Little Endian,
 * uncompressed 16-bit MONOCHROME2) entirely in the browser so the demo works
 * with one click — no sample file, no network, no patient data.
 *
 * The pixel pattern is a synthetic "phantom": a radial gradient with concentric
 * rings and a few discs/blocks of different intensities, so window/level, zoom
 * and measurements are visibly meaningful.
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

function phantomPixels(size: number): Uint8Array {
  const px = new Uint8Array(size * size * 2);
  const dv = new DataView(px.buffer);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      // Radial gradient base.
      let v = 1400 * (1 - Math.min(r / maxR, 1));
      // Concentric rings.
      v += 350 * (0.5 + 0.5 * Math.sin(r / 9));
      // A bright disc upper-left, a darker disc lower-right.
      if (Math.hypot(x - size * 0.32, y - size * 0.34) < size * 0.1) v = 3600;
      if (Math.hypot(x - size * 0.68, y - size * 0.66) < size * 0.09) v = 400;
      // A mid-intensity square.
      if (
        x > size * 0.58 &&
        x < size * 0.78 &&
        y > size * 0.22 &&
        y < size * 0.42
      ) {
        v = 2600;
      }
      const value = Math.max(0, Math.min(4095, Math.round(v)));
      dv.setUint16((y * size + x) * 2, value, true);
    }
  }
  return px;
}

function makeSampleDicomBytes(size = 512): Uint8Array {
  const metaEls: El[] = [
    { group: 0x0002, element: 0x0002, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0002, element: 0x0003, vr: "UI", value: "1.2.826.0.1.3680043.8.9.1" },
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

  const pixels = phantomPixels(size);
  const dataEls: El[] = [
    { group: 0x0008, element: 0x0016, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0008, element: 0x0018, vr: "UI", value: "1.2.826.0.1.3680043.8.9.2" },
    { group: 0x0008, element: 0x0060, vr: "CS", value: "OT" },
    { group: 0x0008, element: 0x103e, vr: "LO", value: "OpDICOM Sample Phantom" },
    { group: 0x0010, element: 0x0010, vr: "PN", value: "SAMPLE^PHANTOM" },
    { group: 0x0010, element: 0x0020, vr: "LO", value: "OPDICOM-DEMO" },
    { group: 0x0020, element: 0x000d, vr: "UI", value: "1.2.826.0.1.3680043.8.9.3" },
    { group: 0x0020, element: 0x000e, vr: "UI", value: "1.2.826.0.1.3680043.8.9.4" },
    { group: 0x0020, element: 0x0013, vr: "IS", value: "1" },
    { group: 0x0028, element: 0x0002, vr: "US", value: "1" },
    { group: 0x0028, element: 0x0004, vr: "CS", value: "MONOCHROME2" },
    { group: 0x0028, element: 0x0010, vr: "US", value: String(size) },
    { group: 0x0028, element: 0x0011, vr: "US", value: String(size) },
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

/** A ready-to-load sample DICOM File for the demo. */
export function makeSampleDicomFile(size = 512): File {
  const bytes = makeSampleDicomBytes(size);
  return new File([bytes as BlobPart], "opdicom-sample.dcm", {
    type: "application/dicom",
  });
}

// ---- 3D volume sample (multi-slice series for MPR) ------------------------

function ballPixels(size: number, sliceIndex: number, slices: number): Uint8Array {
  const px = new Uint8Array(size * size * 2);
  const dv = new DataView(px.buffer);
  const cx = size / 2;
  const cy = size / 2;
  const cz = slices / 2;
  const radius = Math.min(size, slices) * 0.38;
  // Scale z to the in-plane voxel grid so the sphere is round in all planes.
  const zScale = size / slices;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dz = (sliceIndex - cz) * zScale;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz) / zScale;
      let v = 200;
      if (r < radius) v = 3200 * (1 - r / radius) + 400; // bright sphere falloff
      // A couple of embedded high/low spots so planes look distinct.
      if (Math.hypot(dx - size * 0.18, dy) < size * 0.06 && Math.abs(dz) < radius * 0.5) v = 3900;
      const value = Math.max(0, Math.min(4095, Math.round(v)));
      dv.setUint16((y * size + x) * 2, value, true);
    }
  }
  return px;
}

function makeVolumeSliceBytes(
  size: number,
  sliceIndex: number,
  slices: number,
  uids: { study: string; series: string; frame: string },
): Uint8Array {
  const metaEls: El[] = [
    { group: 0x0002, element: 0x0002, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0002, element: 0x0003, vr: "UI", value: `1.2.826.0.1.3680043.8.10.${sliceIndex}` },
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

  const pixels = ballPixels(size, sliceIndex, slices);
  const dataEls: El[] = [
    { group: 0x0008, element: 0x0016, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0008, element: 0x0018, vr: "UI", value: `1.2.826.0.1.3680043.8.11.${sliceIndex}` },
    { group: 0x0008, element: 0x0060, vr: "CS", value: "OT" },
    { group: 0x0008, element: 0x103e, vr: "LO", value: "OpDICOM 3D Phantom" },
    { group: 0x0010, element: 0x0010, vr: "PN", value: "SAMPLE^VOLUME" },
    { group: 0x0010, element: 0x0020, vr: "LO", value: "OPDICOM-3D" },
    { group: 0x0020, element: 0x000d, vr: "UI", value: uids.study },
    { group: 0x0020, element: 0x000e, vr: "UI", value: uids.series },
    { group: 0x0020, element: 0x0052, vr: "UI", value: uids.frame },
    { group: 0x0020, element: 0x0011, vr: "IS", value: "1" },
    { group: 0x0020, element: 0x0013, vr: "IS", value: String(sliceIndex + 1) },
    // Geometry — required to assemble a volume.
    { group: 0x0020, element: 0x0032, vr: "DS", value: `0\\0\\${sliceIndex}` },
    { group: 0x0020, element: 0x0037, vr: "DS", value: "1\\0\\0\\0\\1\\0" },
    { group: 0x0018, element: 0x0050, vr: "DS", value: "1" },
    { group: 0x0028, element: 0x0030, vr: "DS", value: "1\\1" },
    { group: 0x0028, element: 0x0002, vr: "US", value: "1" },
    { group: 0x0028, element: 0x0004, vr: "CS", value: "MONOCHROME2" },
    { group: 0x0028, element: 0x0010, vr: "US", value: String(size) },
    { group: 0x0028, element: 0x0011, vr: "US", value: String(size) },
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

// ---- Multi-frame sample (single file, N frames — a cine loop) -------------

/** A single multi-frame DICOM (moving disc) — like a US/XA cine loop. */
export function makeMultiframeDicomFile(size = 160, frames = 24): File {
  const framePixels = new Uint8Array(size * size * frames * 2);
  const dv = new DataView(framePixels.buffer);
  for (let f = 0; f < frames; f++) {
    // Disc moving on a circular path, so playback clearly looks like motion.
    const angle = (f / frames) * Math.PI * 2;
    const cx = size / 2 + Math.cos(angle) * size * 0.28;
    const cy = size / 2 + Math.sin(angle) * size * 0.28;
    const base = f * size * size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - cx, y - cy);
        const v = d < size * 0.12 ? 3600 : 500 + Math.round(200 * Math.sin(d / 6));
        dv.setUint16((base + y * size + x) * 2, Math.max(0, Math.min(4095, v)), true);
      }
    }
  }

  const metaEls: El[] = [
    { group: 0x0002, element: 0x0002, vr: "UI", value: "1.2.840.10008.5.1.4.1.1.7" },
    { group: 0x0002, element: 0x0003, vr: "UI", value: "1.2.826.0.1.3680043.8.12.1" },
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
    { group: 0x0008, element: 0x0018, vr: "UI", value: "1.2.826.0.1.3680043.8.12.2" },
    { group: 0x0008, element: 0x0060, vr: "CS", value: "US" },
    { group: 0x0008, element: 0x103e, vr: "LO", value: "OpDICOM Cine Loop" },
    { group: 0x0010, element: 0x0010, vr: "PN", value: "SAMPLE^CINE" },
    { group: 0x0020, element: 0x000d, vr: "UI", value: "1.2.826.0.1.3680043.8.12.3" },
    { group: 0x0020, element: 0x000e, vr: "UI", value: "1.2.826.0.1.3680043.8.12.4" },
    { group: 0x0028, element: 0x0008, vr: "IS", value: String(frames) },
    { group: 0x0028, element: 0x0002, vr: "US", value: "1" },
    { group: 0x0028, element: 0x0004, vr: "CS", value: "MONOCHROME2" },
    { group: 0x0028, element: 0x0010, vr: "US", value: String(size) },
    { group: 0x0028, element: 0x0011, vr: "US", value: String(size) },
    { group: 0x0028, element: 0x0100, vr: "US", value: "16" },
    { group: 0x0028, element: 0x0101, vr: "US", value: "16" },
    { group: 0x0028, element: 0x0102, vr: "US", value: "15" },
    { group: 0x0028, element: 0x0103, vr: "US", value: "0" },
    { group: 0x0028, element: 0x1050, vr: "DS", value: "2048" },
    { group: 0x0028, element: 0x1051, vr: "DS", value: "4096" },
    { group: 0x7fe0, element: 0x0010, vr: "OW", value: framePixels },
  ];
  const dataBody = concat(dataEls.map(element));

  const preamble = new Uint8Array(128);
  const magic = new TextEncoder().encode("DICM");
  const bytes = concat([preamble, magic, groupLen, metaBody, dataBody]);
  return new File([bytes as BlobPart], "opdicom-cine.dcm", {
    type: "application/dicom",
  });
}

/** A multi-slice synthetic volume (3D ball phantom) for MPR demos. */
export function makeVolumeSampleFiles(size = 128, slices = 48): File[] {
  const uids = {
    study: "1.2.826.0.1.3680043.8.10.100",
    series: "1.2.826.0.1.3680043.8.10.200",
    frame: "1.2.826.0.1.3680043.8.10.300",
  };
  const files: File[] = [];
  for (let i = 0; i < slices; i++) {
    const bytes = makeVolumeSliceBytes(size, i, slices, uids);
    files.push(
      new File([bytes as BlobPart], `opdicom-vol-${String(i).padStart(3, "0")}.dcm`, {
        type: "application/dicom",
      }),
    );
  }
  return files;
}
