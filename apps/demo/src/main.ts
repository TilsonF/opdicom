import "@opdicom/viewer";
import type { OpdicomViewer } from "@opdicom/viewer";

const viewer = document.getElementById("viewer") as OpdicomViewer;
const fileInput = document.getElementById("file") as HTMLInputElement;

fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) {
    void viewer.loadFiles(fileInput.files);
  }
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
