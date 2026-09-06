// Served from public/ as WebP alongside the other product shots (see
// scripts/optimize-images.mts). The original JPEG stays on disk as a fallback
// for any externally-referenced URL.
const bacWaterImage = '/bac-water.webp';

export const BAC_WATER_IMAGE_URL = bacWaterImage;

const NAME_TO_LOCAL_IMAGE: Array<[string, string]> = [
  ['bacteriostatic', bacWaterImage],
  ['bac-water',      bacWaterImage],
  ['retatrutide',    '/reta.webp'],
  ['tirzepatide',    '/TIRZ.webp'],
  ['ghk-cu',         '/GHKCU.webp'],
  ['ghk cu',         '/GHKCU.webp'],
  ['semax',          '/SEMAX.webp'],
  ['selank',         '/SELANK.webp'],
  ['bpc',            '/BPC.webp'],
  ['nad+',           '/NAD+.webp'],
  ['nad ',           '/NAD+.webp'],
  ['tb-500',         '/TB500.webp'],
  ['tb500',          '/TB500.webp'],
  ['tesamorelin',    '/TESA.webp'],
  ['mot-c',          '/MOTSC.webp'],
  ['motc',           '/MOTSC.webp'],
  ['mots-c',         '/MOTSC.webp'],
  ['aod',            '/AOD.webp'],
  ['epithalon',      '/epithnon.webp'],
  ['epithnon',       '/epithnon.webp'],
  ['kisspeptin',     '/Kisspeptin.webp'],
  ['ss-31',          '/SS-31.webp'],
  ['ss31',           '/SS-31.webp'],
  ['klow',           '/KLOW.webp'],
  ['wolverine',      '/Wolverine.webp'],
  ['cjc',            '/CJC+ipa.webp'],
  ['cagrilintide',   '/Cagrilintide.webp'],
];

/**
 * Resolves product image URL for display.
 *
 * Priority order:
 * 1. Name-based mapping → always resolves to a known-good local image
 * 2. Provided imageUrl  → pass-through if name match not found
 * 3. Empty string       → component will show its bg-color placeholder
 */
export function getProductImageUrl(imageUrl: string, productName?: string): string {
  const normalizedName = (productName ?? '').toLowerCase();

  for (const [keyword, localPath] of NAME_TO_LOCAL_IMAGE) {
    if (normalizedName.includes(keyword)) {
      return localPath;
    }
  }

  // Name not matched — try URL-based heuristics for bac-water
  if (
    imageUrl === '/bac-water.jpg' ||
    imageUrl === 'bac-water.jpg' ||
    imageUrl.endsWith('bac-water.jpg') ||
    imageUrl.toLowerCase().includes('bac-water')
  ) {
    return bacWaterImage;
  }

  return imageUrl ?? '';
}
