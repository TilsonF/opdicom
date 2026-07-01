import "@opdicom/viewer";
import type { OpdicomViewer } from "@opdicom/viewer";
import {
  makeMultiframeDicomFile,
  makeSampleDicomFile,
  makeVolumeSampleFiles,
} from "./sample-dicom.js";

const viewer = document.getElementById("viewer") as OpdicomViewer;
const fileInput = document.getElementById("file") as HTMLInputElement;
const sampleBtn = document.getElementById("sample") as HTMLButtonElement;
const sample3dBtn = document.getElementById("sample3d") as HTMLButtonElement;
const sampleCineBtn = document.getElementById("samplecine") as HTMLButtonElement;

fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) {
    void viewer.loadFiles(fileInput.files);
  }
});

sampleBtn.addEventListener("click", () => {
  void viewer.loadFiles([makeSampleDicomFile()]);
});

sample3dBtn.addEventListener("click", () => {
  viewer.layout = "mpr";
  void viewer.loadFiles(makeVolumeSampleFiles());
});

sampleCineBtn.addEventListener("click", () => {
  viewer.layout = "1x1";
  void viewer.loadFiles([makeMultiframeDicomFile()]);
});

viewer.addEventListener("opdicom-load", (e) => {
  const detail = (e as CustomEvent).detail;
  // eslint-disable-next-line no-console
  console.log("Loaded DICOM:", detail.metadata);
});

viewer.addEventListener("opdicom-error", (e) => {
  // eslint-disable-next-line no-console
  console.error("OpDICOM error:", (e as CustomEvent).detail.error);
});
