import sharp, { type Metadata } from 'sharp';

export interface ImageOptimizationOptions {
  maxDimension?: number;
  quality?: number;
  alphaQuality?: number;
}

export interface OptimizedImageResult {
  buffer: Buffer;
  format: 'webp';
  contentType: 'image/webp';
  extension: '.webp';
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
  savedBytes: number;
  savingsPercent: number;
  hasAlpha: boolean;
  originalFormat: string;
}

export class ImageOptimizationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'IMAGE_OPTIMIZATION_FAILED', statusCode: number = 400) {
    super(message);
    this.name = 'ImageOptimizationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const SUPPORTED_INPUT_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp']);
const DEFAULT_MAX_DIMENSION = 1200;
const DEFAULT_QUALITY = 82; // 80-85 range for high visual fidelity and lightweight byte size
const DEFAULT_ALPHA_QUALITY = 90; // Preserves crisp edges for transparent PNG logos/sweets
const MAX_DECODED_INPUT_BYTES = 5 * 1024 * 1024; // 5MB max payload guard

/**
 * Validates and optimizes sweet/product images to high-efficiency WebP.
 * Resizes oversized images to max 1200px on the longest edge while preserving aspect ratio.
 * Never upscales smaller images. Preserves alpha channel transparency.
 * Strips camera and geolocation metadata for privacy and byte reduction.
 */
export async function optimizeProductImage(
  inputBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    throw new ImageOptimizationError('Decoded image data is empty or invalid.', 'EMPTY_IMAGE', 400);
  }

  if (inputBuffer.length > MAX_DECODED_INPUT_BYTES) {
    throw new ImageOptimizationError(
      `Image size (${(inputBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of 5MB.`,
      'FILE_TOO_LARGE',
      400
    );
  }

  const maxDimension = options.maxDimension || DEFAULT_MAX_DIMENSION;
  const quality = Math.min(Math.max(options.quality || DEFAULT_QUALITY, 60), 95);
  const alphaQuality = Math.min(Math.max(options.alphaQuality || DEFAULT_ALPHA_QUALITY, 70), 100);

  let metadata: Metadata;
  try {
    metadata = await sharp(inputBuffer, { failOn: 'error' }).metadata();
  } catch (err: any) {
    throw new ImageOptimizationError(
      'Image file is corrupted or could not be decoded. Please upload a valid JPEG, PNG, or WebP photo.',
      'CORRUPTED_IMAGE',
      400
    );
  }

  const detectedFormat = (metadata.format || '').toLowerCase();
  if (!detectedFormat || !SUPPORTED_INPUT_FORMATS.has(detectedFormat)) {
    throw new ImageOptimizationError(
      `Unsupported image format '${detectedFormat || 'unknown'}'. Only JPEG, PNG, and WebP product images are supported.`,
      'UNSUPPORTED_FORMAT',
      400
    );
  }

  if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
    throw new ImageOptimizationError(
      'Invalid image dimensions detected.',
      'INVALID_DIMENSIONS',
      400
    );
  }

  try {
    // Process pipeline:
    // 1. rotate(): Auto-align based on EXIF orientation tag
    // 2. resize(): Bound longest edge to maxDimension, inside fit, no stretching, no upscaling
    // 3. webp(): Modern compressed format with alpha transparency support
    // Notice: metadata is stripped by default because we do not call .withMetadata()
    const pipeline = sharp(inputBuffer, { failOn: 'error' })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality,
        alphaQuality,
        effort: 4, // Balances CPU processing time with high compression ratio
      });

    const optimizedBuffer = await pipeline.toBuffer();
    const resultMeta = await sharp(optimizedBuffer).metadata();

    const originalBytes = inputBuffer.length;
    const optimizedBytes = optimizedBuffer.length;
    const savedBytes = Math.max(0, originalBytes - optimizedBytes);
    const savingsPercent = originalBytes > 0
      ? Number((((originalBytes - optimizedBytes) / originalBytes) * 100).toFixed(1))
      : 0;

    return {
      buffer: optimizedBuffer,
      format: 'webp',
      contentType: 'image/webp',
      extension: '.webp',
      width: resultMeta.width || metadata.width,
      height: resultMeta.height || metadata.height,
      originalBytes,
      optimizedBytes,
      savedBytes,
      savingsPercent,
      hasAlpha: Boolean(resultMeta.hasAlpha),
      originalFormat: detectedFormat,
    };
  } catch (err: any) {
    throw new ImageOptimizationError(
      `Failed to optimize image: ${err?.message || 'Processing error'}`,
      'PROCESSING_FAILED',
      500
    );
  }
}
