import imageCompression from "browser-image-compression";

export type CompressOptions = {
  maxSizeKB?: number;
  maxWidthOrHeight?: number;
};

/**
 * Resizes/compresses an image fully client-side. Handles EXIF
 * orientation from phone cameras automatically (a common source of
 * sideways scanned documents). No network call -- the file never
 * leaves the browser until the admin chooses to save it.
 */
export async function compressImage(file: File, options: CompressOptions): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: (options.maxSizeKB ?? 200) / 1024,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1920,
    useWebWorker: true,
    fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
    initialQuality: 0.85,
  });

  // browser-image-compression preserves the original filename; keep
  // it, since the caller (upload flow / download) relies on it.
  return new File([compressed], file.name, { type: compressed.type });
}
