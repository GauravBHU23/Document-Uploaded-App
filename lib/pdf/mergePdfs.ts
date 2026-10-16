import { PDFDocument } from "pdf-lib";

/**
 * Merges a mix of PDF and image files (JPEG/PNG) into a single PDF,
 * in the given order. Runs entirely client-side -- no server round
 * trip, no network call, keeping this free regardless of usage.
 */
export async function mergeFilesToPdf(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    if (file.type === "application/pdf") {
      const bytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
      continue;
    }

    if (file.type === "image/jpeg" || file.type === "image/png") {
      const bytes = await file.arrayBuffer();
      const image =
        file.type === "image/jpeg"
          ? await mergedPdf.embedJpg(bytes)
          : await mergedPdf.embedPng(bytes);

      const page = mergedPdf.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      continue;
    }

    throw new Error(`Unsupported file type: ${file.name} (${file.type || "unknown"})`);
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}
