/**
 * Canonical URL helpers.
 *
 * The site is prerendered to `dist/<route>/index.html`, which Cloudflare Pages
 * serves at `/<route>/` (it 308-redirects the slash-less form). Google indexes
 * the trailing-slash URLs, so every canonical, sitemap entry, schema URL and
 * internal link must use the SAME form — otherwise each page points its
 * canonical at a redirect and Google has to guess which URL is "real".
 */
export const SITE_ORIGIN = 'https://retralabs.in';

/** Normalise an app route to its canonical path: leading slash, trailing slash, no query/hash. */
export function canonicalPath(route: string): string {
  let path = route.split(/[?#]/)[0] || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path = `${path}/`;
  return path;
}

/** Absolute canonical URL for an app route, e.g. `/about` → `https://retralabs.in/about/`. */
export function canonicalUrl(route: string): string {
  return `${SITE_ORIGIN}${canonicalPath(route)}`;
}
