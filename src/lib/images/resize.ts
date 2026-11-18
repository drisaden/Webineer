/**
 * Shrink a photo in the browser before it is uploaded, so big phone photos don't cost bandwidth or storage.
 * Pure sizing maths lives in `fitWithin` and `shouldResize` so it can be tested without a browser.
 */
export const MAX_IMAGE_EDGE = 2000;
/** Files already this small and within the size limit are uploaded untouched. */
export const SKIP_BELOW_BYTES = 250 * 1024;

export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Animated GIFs and SVGs are left alone, and so are files that are already small and not oversized. */
export function shouldResize(type: string, bytes: number, width: number, height: number, maxEdge = MAX_IMAGE_EDGE): boolean {
  if (type === "image/gif" || type === "image/svg+xml") return false;
  const oversized = Math.max(width, height) > maxEdge;
  return oversized || bytes > SKIP_BELOW_BYTES;
}

export interface ResizeResult {
  file: File;
  resized: boolean;
  beforeBytes: number;
  afterBytes: number;
  width?: number;
  height?: number;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/** Returns the original file whenever resizing isn't possible or doesn't help, so an upload never fails because of this step. */
export async function resizeImageFile(file: File, opts: { maxEdge?: number; quality?: number } = {}): Promise<ResizeResult> {
  const unchanged: ResizeResult = { file, resized: false, beforeBytes: file.size, afterBytes: file.size };
  const maxEdge = opts.maxEdge ?? MAX_IMAGE_EDGE;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return unchanged;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    if (!shouldResize(file.type, file.size, bitmap.width, bitmap.height, maxEdge)) {
      bitmap.close?.();
      return unchanged;
    }
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    // WebP keeps transparency and is much smaller than PNG or JPEG. Fall back to JPEG when the browser can't write it.
    let blob = await toBlob(canvas, "image/webp", opts.quality ?? 0.82);
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(canvas, "image/jpeg", opts.quality ?? 0.85);
      ext = "jpg";
    }
    if (!blob || blob.size >= file.size) return unchanged;
    const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
    return { file: new File([blob], name, { type: blob.type }), resized: true, beforeBytes: file.size, afterBytes: blob.size, width, height };
  } catch {
    return unchanged;
  }
}
