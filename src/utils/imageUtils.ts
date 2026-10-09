/**
 * Image Optimization Utilities for Saraswati Sweets
 * Converts image URLs to responsive modern formats (WebP) with optimized sizes and quality.
 * Supports:
 * - Supabase Storage transformation (format=webp, responsive width, quality)
 * - Unsplash image parameter optimization
 * - Local static PNG assets redirection to WebP
 */

export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 360,
  quality: number = 80
): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Supabase Storage URLs:
  // Convert /storage/v1/object/public/ to /storage/v1/render/image/public/
  if (trimmed.includes('.supabase.co/storage/v1/object/public/')) {
    const transformed = trimmed.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const separator = transformed.includes('?') ? '&' : '?';
    return `${transformed}${separator}width=${width}&quality=${quality}&format=webp`;
  }

  // Already transformed Supabase URL: ensure width/format params
  if (trimmed.includes('.supabase.co/storage/v1/render/image/public/')) {
    if (!trimmed.includes('format=webp')) {
      const separator = trimmed.includes('?') ? '&' : '?';
      return `${trimmed}${separator}width=${width}&quality=${quality}&format=webp`;
    }
    return trimmed;
  }

  // 2. Unsplash URLs: ensure responsive width and webp/auto format
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const u = new URL(trimmed);
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('w', width.toString());
      u.searchParams.set('q', quality.toString());
      return u.toString();
    } catch {
      return trimmed;
    }
  }

  // 3. Local images: map .png to .webp
  if (trimmed.startsWith('/images/') && trimmed.endsWith('.png')) {
    return trimmed.replace(/\.png$/, '.webp');
  }

  return trimmed;
}
