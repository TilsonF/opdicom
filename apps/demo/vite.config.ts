import { defineConfig } from "vite";

export default defineConfig({
  // The OpDICOM workspace packages are shipped as TS source; let Vite compile
  // them instead of pre-bundling, so decorators/types resolve correctly.
  optimizeDeps: {
    exclude: ["@opdicom/viewer", "@opdicom/core", "@opdicom/parser"],
    include: [
      "@cornerstonejs/core",
      "@cornerstonejs/tools",
      "@cornerstonejs/dicom-image-loader",
      "dicom-parser",
    ],
  },
  worker: {
    format: "es",
  },
  server: {
    port: 5180,
  },
});
