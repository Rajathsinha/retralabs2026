import bacWaterImage from '../assets/bac-water.jpg';

export const BAC_WATER_IMAGE_URL = bacWaterImage;

const NAME_TO_LOCAL_IMAGE: Array<[string, string]> = [
  ['bacteriostatic', bacWaterImage],
  ['bac-water',      bacWaterImage],
  ['retatrutide',    '/reta.png'],
  ['tirzepatide',    '/TIRZ.png'],
  ['ghk-cu',         '/GHKCU.png'],
  ['ghk cu',         '/GHKCU.png'],
  ['semax',          '/SEMAX.png'],
  ['selank',         '/SELANK.png'],
  ['bpc',            '/BPC.png'],
  ['nad+',           '/NAD+.png'],
  ['nad ',           '/NAD+.png'],
  ['tb-500',         '/TB500.png'],
  ['tb500',          '/TB500.png'],
  ['tesamorelin',    '/TESA.png'],
  ['mot-c',          '/MOTSC.png'],
  ['motc',           '/MOTSC.png'],
  ['mots-c',         '/MOTSC.png'],
  ['aod',            '/AOD.png'],
  ['epithalon',      '/epithnon.png'],
  ['epithnon',       '/epithnon.png'],
  ['kisspeptin',     '/Kisspeptin.png'],
  ['ss-31',          '/SS-31.png'],
  ['ss31',           '/SS-31.png'],
  ['klow',           '/KLOW.png'],
  ['wolverine',      '/Wolverine.png'],
  ['cjc',            '/CJC+ipa.png'],
  ['cagrilintide',   '/Cagrilintide.png'],
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
