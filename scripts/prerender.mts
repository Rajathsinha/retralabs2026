/**
 * Post-build prerenderer.
 *
 * Serves the built dist/ with vite preview, renders every SEO route in
 * headless Chrome, and writes the fully-rendered HTML back into dist/ as
 * static snapshots (dist/<route>/index.html). Netlify serves these files
 * directly (a 200 rewrite without `force` never shadows real files), so
 * crawlers get complete HTML while the SPA still boots normally for users.
 *
 * Escape hatch: PRERENDER_SKIP=1 skips prerendering entirely.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import puppeteer from 'puppeteer';
import { SEO_ROUTES } from './seo-routes.mts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;

// Title of the static shell (index.html) — product pages must have replaced it
// before we snapshot, which proves the per-page useSEO hook has run.
const SHELL_TITLE_PREFIX = 'Buy Retatrutide India | Research Peptides';

async function main() {
  if (process.env.PRERENDER_SKIP === '1') {
    console.log('[prerender] PRERENDER_SKIP=1 — skipping.');
    return;
  }

  const server = await preview({
    root: ROOT,
    preview: { port: PORT, strictPort: true },
  });

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let failed = 0;
  try {
    for (const route of SEO_ROUTES) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1440, height: 1080 });

        // Runs before any app JS on every navigation:
        // - suppress the COD announcement modal (it checks this sessionStorage key)
        // - expose a flag components may use to detect prerendering
        // NOTE: browser-side code is passed as strings — tsx/esbuild injects a
        // __name helper into serialized functions that doesn't exist in the page.
        await page.evaluateOnNewDocument(
          `window.__PRERENDER__ = true; try { sessionStorage.setItem('cod_announce_shown', '1'); } catch (e) {}`,
        );

        // Determinism: never wait on (or embed DOM from) third parties like the
        // Trustpilot widget or Google Fonts. Their <script>/<link> tags remain in
        // the captured HTML, so real visitors still load them.
        await page.setRequestInterception(true);
        page.on('request', req => {
          const url = new URL(req.url());
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') req.continue();
          else req.abort();
        });

        await page.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle0', timeout: 30_000 });

        // Real content rendered (not the empty shell)
        await page.waitForFunction(
          `(document.querySelector('#root') && document.querySelector('#root').textContent.length > 500)`,
          { timeout: 15_000 },
        );
        // Product pages: per-page title must have replaced the static shell title
        if (route.startsWith('/product/')) {
          await page.waitForFunction(
            `!document.title.startsWith(${JSON.stringify(SHELL_TITLE_PREFIX)})`,
            { timeout: 15_000 },
          );
        }

        // Trigger whileInView animations so nothing is captured at opacity 0
        await page.evaluate(`(async () => {
          const sleep = ms => new Promise(r => setTimeout(r, ms));
          const step = window.innerHeight;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await sleep(80);
          }
          window.scrollTo(0, 0);
        })()`);
        await new Promise(r => setTimeout(r, 400));

        const html = '<!DOCTYPE html>' + (await page.evaluate('document.documentElement.outerHTML'));

        const outDir = route === '/' ? DIST : join(DIST, route.slice(1));
        await mkdir(outDir, { recursive: true });
        await writeFile(join(outDir, 'index.html'), html, 'utf8');
        console.log(`[prerender] ✓ ${route} (${(html.length / 1024).toFixed(0)} KB)`);
      } catch (err) {
        failed++;
        console.error(`[prerender] ✗ ${route}:`, err instanceof Error ? err.message : err);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.httpServer.close(err => (err ? reject(err) : resolve())),
    );
  }

  if (failed > 0) {
    console.error(`[prerender] ${failed} route(s) failed — failing the build.`);
    process.exit(1);
  }
  console.log(`[prerender] Done: ${SEO_ROUTES.length} routes snapshotted.`);
}

main().catch(err => {
  console.error('[prerender] fatal:', err);
  process.exit(1);
});
