import { wadouri } from "@cornerstonejs/dicom-image-loader";

/**
 * Register browser File/Blob objects with Cornerstone and return their
 * `dicomfile:` imageIds (the same scheme the stack viewer uses), so they can be
 * loaded as a stack or assembled into a volume for MPR.
 */
export function filesToImageIds(files: ArrayLike<Blob>): string[] {
  return Array.from(files).map((file) => wadouri.fileManager.add(file));
}
