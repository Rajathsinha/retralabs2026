import { PRODUCTS } from '../data/products';
import type { Product, ProductWithVariants } from '../types';
import { canonicalPath, canonicalUrl } from './siteUrl';

/**
 * Product URLs are keyword slugs (`/product/retatrutide/`), not numeric IDs.
 * The numeric IDs stay as the internal primary key; legacy `/product/<id>`
 * URLs are 301-redirected at the edge (public/_redirects) and, as a fallback,
 * client-side in ProductDetailPage.
 */
export function productPath(product: Pick<Product, 'slug'>): string {
  return canonicalPath(`/product/${product.slug}`);
}

export function productUrl(product: Pick<Product, 'slug'>): string {
  return canonicalUrl(`/product/${product.slug}`);
}

/** Resolve a route param that may be a slug (current) or a legacy numeric id. */
export function findProductByParam(param: string | undefined): ProductWithVariants | undefined {
  if (!param) return undefined;
  const key = param.replace(/\/+$/, '').toLowerCase();
  return PRODUCTS.find(p => p.slug === key) ?? PRODUCTS.find(p => p.id === key);
}

export function isLegacyProductParam(param: string | undefined): boolean {
  return Boolean(param) && /^\d+\/?$/.test(param as string);
}
