# Connectivity — which devices/sources can OpDICOM connect to, and how

OpDICOM runs **entirely in the browser**. Browsers cannot speak the classic
DICOM network protocol (DIMSE: `C-STORE`, `C-FIND`, `C-MOVE` over raw TCP), which
is what imaging **devices** use on a hospital network. So OpDICOM connects to
imaging data through two browser-friendly channels:

1. **Local files** — any `.dcm` exported to disk (drag & drop / file picker).
2. **DICOMweb** — the HTTP/REST face of DICOM, served by a PACS/VNA/cloud.

```
 Modality (CT/MR/US/XR…) ──DIMSE C-STORE──▶ PACS / VNA / Archive ──DICOMweb (HTTP)──▶ OpDICOM (browser)
                                              └─ Orthanc, dcm4chee, cloud, … ─┘
 Local export (.dcm) ───────────────────────────────────────────drag & drop──▶ OpDICOM
```

## 1. Local files (works today)

Any device that can export DICOM to a USB/disk/share works — the modality is
irrelevant once it's a `.dcm` file:

- CT, MR, Ultrasound, X-ray (CR/DR), Mammography (incl. tomosynthesis),
  PET/PET-CT, Angiography (XA), Fluoroscopy, Nuclear medicine, OCT, Endoscopy,
  Digital pathology (WSI), Dental (IO/Pano/CBCT), Veterinary.

```js
viewer.loadFiles(fileList); // from <input type=file> or drag & drop
```

No server, no network — the data never leaves the machine.

## 2. DICOMweb servers (PACS / VNA / cloud)

OpDICOM speaks **WADO-RS** (retrieve) and **QIDO-RS** (query). Point it at any
DICOMweb endpoint:

```js
await viewer  // (engine API)
  .loadFromDicomWeb(
    {
      wadoRsRoot: "https://server/dicom-web",
      // qidoRsRoot defaults to wadoRsRoot
      headers: { Authorization: "Bearer <token>" }, // optional auth
    },
    { studyInstanceUID: "1.2.…", seriesInstanceUID: "1.2.…" },
  );
```

### Servers known to expose DICOMweb

| Server / platform | DICOMweb | Notes |
| --- | --- | --- |
| **Orthanc** (open source) | via the **DICOMweb plugin** | Easiest to self-host; great for testing |
| **dcm4chee-arc-light** (open source) | built-in | Full-featured archive |
| **Google Cloud Healthcare API** | DICOM stores | OAuth2 bearer tokens |
| **AWS HealthImaging** | DICOMweb-compatible | SigV4 / token auth |
| **Azure Health Data Services — DICOM service** | built-in | AAD bearer tokens |
| **DCMcloud / DICOMcloud** | yes | |
| **Many commercial PACS/VNA** | yes (often a licensed module) | Confirm WADO-RS/QIDO-RS is enabled |

### How a physical device's images reach OpDICOM

A scanner does **not** connect to a browser directly. The normal path:

1. The modality sends images to a **PACS/VNA/archive** via DIMSE `C-STORE`
   (or, increasingly, **STOW-RS** over HTTP).
2. That archive exposes **DICOMweb**.
3. OpDICOM queries (QIDO) and retrieves (WADO) over HTTPS.

If a device only speaks DIMSE and your archive has no DICOMweb, put a **gateway**
in between (e.g. Orthanc acts as a DIMSE SCP **and** a DICOMweb server, bridging
the two). That gateway is the supported way to "connect a device."

### Requirements & gotchas

- **CORS**: the DICOMweb server must allow the web app's origin (send
  `Access-Control-Allow-Origin` / headers), or you must front it with a reverse
  proxy that adds CORS. Without this the browser blocks the requests.
- **HTTPS**: serve the app and the endpoint over TLS; mixed content is blocked.
- **Auth**: pass tokens via `headers` (Bearer/OAuth2). OpDICOM never stores them.
- **Multi-frame / compressed transfer syntaxes**: pixel decoding (JPEG2000,
  JPEG-LS, RLE…) happens client-side via bundled WASM codecs.

## 3. What is *not* supported (by design)

- **Direct device → browser DIMSE** — browsers can't open raw DICOM sockets, and
  doing so would bypass the archive/audit trail. Use a DICOMweb gateway.
- **Modality Worklist / MPPS** — these are scheduling workflows for devices, not
  viewer concerns.

## Try it locally with Orthanc (Docker)

```bash
docker run -p 8042:8042 -p 4242:4242 \
  -e ORTHANC__DICOM_WEB__ENABLE=true \
  jodogne/orthanc-plugins
```

- DICOMweb root: `http://localhost:8042/dicom-web`
- Upload a study via the Orthanc UI (`http://localhost:8042`), then in OpDICOM:

```js
await engine.loadFromDicomWeb(
  { wadoRsRoot: "http://localhost:8042/dicom-web" },
  { studyInstanceUID, seriesInstanceUID },
);
```

> Reminder: OpDICOM is **not** a medical device and is not for primary diagnosis.
