// Served from public/ as WebP alongside the other product shots (see
// scripts/optimize-images.mts). The original JPEG stays on disk as a fallback
// for any externally-referenced URL.
const bacWaterImage = '/Catalogue/bacteriostatic-water-vial-india.webp';

export const BAC_WATER_IMAGE_URL = bacWaterImage;

// Thumbnail crop: just the vial, used in cards, cart, search, thumbnails rail.
const NAME_TO_LOCAL_IMAGE: Array<[string, string]> = [
  ['bacteriostatic', bacWaterImage],
  ['bac-water',      bacWaterImage],
  ['retatrutide',    '/Catalogue/retatrutide-peptide-vial-india.webp'],
  ['tirzepatide',    '/TIRZ.webp'],
  ['ghk-cu',         '/Catalogue/ghk-cu-peptide-vial-india.webp'],
  ['ghk cu',         '/Catalogue/ghk-cu-peptide-vial-india.webp'],
  ['semax',          '/Catalogue/semax-peptide-vial-india.webp'],
  ['selank',         '/Catalogue/selank-peptide-vial-india.webp'],
  ['bpc',            '/Catalogue/bpc-157-peptide-vial-india.webp'],
  ['nad+',           '/Catalogue/nad-plus-peptide-vial-india.webp'],
  ['nad ',           '/Catalogue/nad-plus-peptide-vial-india.webp'],
  ['tb-500',         '/Catalogue/tb-500-peptide-vial-india.webp'],
  ['tb500',          '/Catalogue/tb-500-peptide-vial-india.webp'],
  ['tesamorelin',    '/Catalogue/tesamorelin-peptide-vial-india.webp'],
  ['mot-c',          '/Catalogue/mots-c-peptide-vial-india.webp'],
  ['motc',           '/Catalogue/mots-c-peptide-vial-india.webp'],
  ['mots-c',         '/Catalogue/mots-c-peptide-vial-india.webp'],
  ['aod',            '/Catalogue/aod-9604-peptide-vial-india.webp'],
  ['epithalon',      '/epithnon.webp'],
  ['epithnon',       '/epithnon.webp'],
  ['kisspeptin',     '/Kisspeptin.webp'],
  ['ss-31',          '/Catalogue/ss-31-peptide-vial-india.webp'],
  ['ss31',           '/Catalogue/ss-31-peptide-vial-india.webp'],
  ['klow',           '/Catalogue/klow-peptide-blend-vial-india.webp'],
  ['wolverine',      '/Catalogue/wolverine-stack-peptide-vial-india.webp'],
  ['cjc',            '/Catalogue/cjc-1295-ipamorelin-stack-vial-india.webp'],
  ['cagrilintide',   '/Catalogue/cagrilintide-peptide-vial-india.webp'],
];

// Full marketing poster (headline, benefit bullets, disclaimers baked in) —
// only used for the large hero slot on the product detail page, where the
// text is actually legible. Products not listed here have no poster; hero
// resolution falls back to the thumbnail crop.
const NAME_TO_HERO_IMAGE: Array<[string, string]> = [
  ['retatrutide',    '/Catalogue/retatrutide-peptide-poster-india.webp'],
  ['ghk-cu',         '/Catalogue/ghk-cu-peptide-poster-india.webp'],
  ['ghk cu',         '/Catalogue/ghk-cu-peptide-poster-india.webp'],
  ['semax',          '/Catalogue/semax-peptide-poster-india.webp'],
  ['selank',         '/Catalogue/selank-peptide-poster-india.webp'],
  ['bpc',            '/Catalogue/bpc-157-peptide-poster-india.webp'],
  ['nad+',           '/Catalogue/nad-plus-peptide-poster-india.webp'],
  ['nad ',           '/Catalogue/nad-plus-peptide-poster-india.webp'],
  ['tb-500',         '/Catalogue/tb-500-peptide-poster-india.webp'],
  ['tb500',          '/Catalogue/tb-500-peptide-poster-india.webp'],
  ['tesamorelin',    '/Catalogue/tesamorelin-peptide-poster-india.webp'],
  ['mot-c',          '/Catalogue/mots-c-peptide-poster-india.webp'],
  ['motc',           '/Catalogue/mots-c-peptide-poster-india.webp'],
  ['mots-c',         '/Catalogue/mots-c-peptide-poster-india.webp'],
  ['aod',            '/Catalogue/aod-9604-peptide-poster-india.webp'],
  ['ss-31',          '/Catalogue/ss-31-peptide-poster-india.webp'],
  ['ss31',           '/Catalogue/ss-31-peptide-poster-india.webp'],
  ['klow',           '/Catalogue/klow-peptide-blend-poster-india.webp'],
  ['wolverine',      '/Catalogue/wolverine-stack-peptide-poster-india.webp'],
  ['cjc',            '/Catalogue/cjc-1295-ipamorelin-stack-poster-india.webp'],
  ['cagrilintide',   '/Catalogue/cagrilintide-peptide-poster-india.webp'],
  ['bacteriostatic', '/Catalogue/bacteriostatic-water-poster-india.webp'],
  ['bac-water',      '/Catalogue/bacteriostatic-water-poster-india.webp'],
];

/**
 * Resolves product image URL for display.
 *
 * Priority order:
 * 1. Name-based mapping → always resolves to a known-good local image
 * 2. Provided imageUrl  → pass-through if name match not found
 * 3. Empty string       → component will show its bg-color placeholder
 *
 * variant 'hero' returns the full marketing poster for products that have
 * one (product detail page main image); everything else — cards, cart,
 * search, thumbnail rails — should stay on the default 'thumb' crop.
 */
export function getProductImageUrl(
  imageUrl: string,
  productName?: string,
  variant: 'thumb' | 'hero' = 'thumb',
): string {
  const normalizedName = (productName ?? '').toLowerCase();

  if (variant === 'hero') {
    for (const [keyword, localPath] of NAME_TO_HERO_IMAGE) {
      if (normalizedName.includes(keyword)) {
        return localPath;
      }
    }
  }

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
