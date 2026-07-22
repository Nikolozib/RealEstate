// Client-side image compression: resize to a max dimension and re-encode to
// WebP (falling back to JPEG where WebP encoding isn't supported) before the
// file ever leaves the browser. Property photos come straight off phone
// cameras and can run 5-10MB uncompressed; this keeps uploads fast and keeps
// listing pages fast for visitors, without a visible quality hit.

export interface CompressOptions {
  /** Longest edge, in pixels, after resizing. Upscaling never happens. */
  maxDimension?: number;
  /** 0..1 encoder quality. */
  quality?: number;
}

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

const DEFAULTS: Required<CompressOptions> = { maxDimension: 1600, quality: 0.8 };

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<CompressedImage> {
  const { maxDimension, quality } = { ...DEFAULTS, ...options };

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, 'image/webp', quality);
  // Browsers without a WebP encoder silently hand back PNG instead of
  // rejecting — detect that and re-encode as JPEG, which is universally
  // supported and still far smaller than the original PNG/camera JPEG.
  if (webp && webp.type === 'image/webp') return { blob: webp, width, height };

  const jpeg = await toBlob(canvas, 'image/jpeg', quality);
  if (!jpeg) throw new Error('Image compression failed.');
  return { blob: jpeg, width, height };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}
