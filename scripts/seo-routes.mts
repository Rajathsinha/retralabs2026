import { PRODUCTS } from '../src/data/products';

/**
 * Single source of truth for every route that gets prerendered and listed
 * in sitemap.xml. Checkout/payment/admin are deliberately excluded — they
 * are noindexed and stay SPA-only via the Netlify fallback.
 */
export const STATIC_ROUTES = [
  '/',
  '/catalogue',
  '/about',
  '/contact',
  '/support',
  '/privacy',
  '/terms',
  '/refund',
];

export const PRODUCT_ROUTES = PRODUCTS.map(p => `/product/${p.id}`);

export const SEO_ROUTES = [...STATIC_ROUTES, ...PRODUCT_ROUTES];
