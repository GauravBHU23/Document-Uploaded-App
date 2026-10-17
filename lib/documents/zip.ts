import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Document } from "@/lib/types";
import { getSignedUrl } from "./upload";

/** Filenames must be unique inside a zip -- two documents can share a
 * label (e.g. two "Aadhar Card" uploads for the same person at
 * different times), so duplicates get a " (2)", " (3)", ... suffix
 * before the extension rather than silently overwriting each other. */
function uniqueZipName(label: string, mimeType: string, seen: Map<string, number>) {
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(label);
  const extension = hasExtension ? "" : mimeType === "application/pdf" ? ".pdf" : mimeType.startsWith("image/") ? `.${mimeType.split("/")[1]}` : "";
  const base = `${label}${extension}`;

  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  if (count === 0) return base;

  const dotIndex = base.lastIndexOf(".");
  const name = dotIndex > 0 ? base.slice(0, dotIndex) : base;
  const ext = dotIndex > 0 ? base.slice(dotIndex) : "";
  return `${name} (${count + 1})${ext}`;
}

export type ZipDownloadResult = {
  succeeded: number;
  failed: string[];
};

/** Downloads every given document and bundles them into a single .zip
 * file, instead of triggering N separate browser downloads. Fetches
 * sequentially (not in parallel) to stay gentle on the 60-second
 * signed URLs and avoid hammering Storage with a burst of requests
 * for someone with many documents.
 *
 * A single document failing (expired signed URL, transient network
 * blip) no longer aborts the whole batch -- it's skipped and reported
 * back in `failed`, so someone downloading 20 documents still gets 19
 * of them instead of none. Throws only if EVERY document fails (zero
 * files would otherwise produce a valid-looking but empty zip). */
export async function downloadDocumentsAsZip(
  supabase: SupabaseClient,
  documents: Document[],
  zipFilename: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ZipDownloadResult> {
  const zip = new JSZip();
  const seenNames = new Map<string, number>();
  const failed: string[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    try {
      const url = await getSignedUrl(supabase, doc.storage_path, 60);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const name = uniqueZipName(doc.label, doc.mime_type, seenNames);
      zip.file(name, blob);
    } catch {
      failed.push(doc.label);
    }
    onProgress?.(i + 1, documents.length);
  }

  if (failed.length === documents.length) {
    throw new Error("Could not download any of the selected files");
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(zipBlob);
  const a = window.document.createElement("a");
  a.href = blobUrl;
  a.download = zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`;
  a.click();
  URL.revokeObjectURL(blobUrl);

  return { succeeded: documents.length - failed.length, failed };
}
