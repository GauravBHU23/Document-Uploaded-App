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

/** Downloads every given document and bundles them into a single .zip
 * file, instead of triggering N separate browser downloads. Fetches
 * sequentially (not in parallel) to stay gentle on the 60-second
 * signed URLs and avoid hammering Storage with a burst of requests
 * for someone with many documents. */
export async function downloadDocumentsAsZip(
  supabase: SupabaseClient,
  documents: Document[],
  zipFilename: string,
  onProgress?: (done: number, total: number) => void,
) {
  const zip = new JSZip();
  const seenNames = new Map<string, number>();

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const url = await getSignedUrl(supabase, doc.storage_path, 60);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not download "${doc.label}"`);
    const blob = await response.blob();
    const name = uniqueZipName(doc.label, doc.mime_type, seenNames);
    zip.file(name, blob);
    onProgress?.(i + 1, documents.length);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(zipBlob);
  const a = window.document.createElement("a");
  a.href = blobUrl;
  a.download = zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
