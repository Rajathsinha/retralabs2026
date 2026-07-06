/**
 * Generates dist/sitemap.xml from the same route list the prerenderer uses,
 * so the sitemap can never drift from what actually exists. Runs after
 * `vite build` (overwrites anything copied from public/).
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_ROUTES } from './seo-routes.mts';

const SITE = 'https://retralabs.in';
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const lastmod = new Date().toISOString().slice(0, 10);

function priorityFor(route: string): string {
  if (route === '/') return '1.0';
  if (route === '/catalogue' || route.startsWith('/product/')) return '0.9';
  return '0.6';
}

function changefreqFor(route: string): string {
  if (route === '/' || route === '/catalogue' || route.startsWith('/product/')) return 'weekly';
  return 'monthly';
}

const entries = SEO_ROUTES.map(route => `  <url>
    <loc>${SITE}${route === '/' ? '/' : route}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreqFor(route)}</changefreq>
    <priority>${priorityFor(route)}</priority>
  </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

await writeFile(join(DIST, 'sitemap.xml'), xml, 'utf8');
console.log(`[sitemap] ${SEO_ROUTES.length} URLs written to dist/sitemap.xml (lastmod ${lastmod})`);
