/**
 * Cleans up a photographed signature on paper: treats near-white
 * pixels as transparent and darkens the ink, producing a clean
 * transparent-background signature from a phone photo. A full
 * ML background-removal model would be overkill for this -- a simple
 * luminance-threshold pass over the canvas's pixel buffer is enough
 * for "signature in pen on white/light paper" and keeps this
 * dependency-free and instant.
 */
export async function cleanPhotographedSignature(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  // Luminance threshold: pixels brighter than this are treated as
  // paper/background and made transparent; darker pixels are ink and
  // get boosted to solid black for a crisp result.
  const LUMINANCE_THRESHOLD = 180;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance > LUMINANCE_THRESHOLD) {
      data[i + 3] = 0; // fully transparent
    } else {
      // Fade alpha smoothly near the threshold so edges aren't jagged.
      const alpha = Math.min(255, Math.round(((LUMINANCE_THRESHOLD - luminance) / LUMINANCE_THRESHOLD) * 255 * 1.6));
      data[i] = 10;
      data[i + 1] = 10;
      data[i + 2] = 20;
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not process image"));
    }, "image/png");
  });
}
