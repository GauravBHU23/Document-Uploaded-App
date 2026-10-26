import type { SupabaseClient } from "@supabase/supabase-js";
import type { Document } from "@/lib/types";
import { getSignedUrl } from "./upload";
import { mergeFilesToPdf } from "@/lib/pdf/mergePdfs";

const MERGEABLE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export type MergedPdfResult = {
  succeeded: number;
  failed: string[];
  /** Documents of a type mergeFilesToPdf can't embed (e.g. HEIC, webp)
   * -- skipped rather than aborting the whole export, same tolerance
   * as the zip export's partial-failure handling. */
  skipped: string[];
};

/** Downloads a person's documents and merges them into a single PDF
 * booklet, in the given order -- distinct from the existing zip
 * export (which keeps files separate); this is for when the admin
 * wants one file to print or hand over, not a folder of originals.
 * Fetches sequentially for the same reason downloadDocumentsAsZip
 * does: staying gentle on the 60-second signed URLs rather than
 * bursting Storage with parallel requests. */
export async function downloadDocumentsAsMergedPdf(
  supabase: SupabaseClient,
  documents: Document[],
  pdfFilename: string,
  onProgress?: (done: number, total: number) => void,
): Promise<MergedPdfResult> {
  const failed: string[] = [];
  const skipped: string[] = [];
  const files: File[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    if (!MERGEABLE_TYPES.has(doc.mime_type)) {
      skipped.push(doc.label);
      onProgress?.(i + 1, documents.length);
      continue;
    }

    try {
      const url = await getSignedUrl(supabase, doc.storage_path, 60);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      files.push(new File([blob], doc.label, { type: doc.mime_type }));
    } catch {
      failed.push(doc.label);
    }
    onProgress?.(i + 1, documents.length);
  }

  if (files.length === 0) {
    throw new Error("No PDF or image documents available to merge");
  }

  const mergedBlob = await mergeFilesToPdf(files);
  const blobUrl = URL.createObjectURL(mergedBlob);
  const a = window.document.createElement("a");
  a.href = blobUrl;
  a.download = pdfFilename.endsWith(".pdf") ? pdfFilename : `${pdfFilename}.pdf`;
  a.click();
  URL.revokeObjectURL(blobUrl);

  return { succeeded: files.length, failed, skipped };
}
