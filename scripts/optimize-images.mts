/**
 * Generates WebP versions of the product and testimonial images in public/.
 *
 * Why: the source PNGs are 2000x2000 exports running 1.1-1.7MB each. The
 * product hero is the Largest Contentful Paint element on every product page,
 * so those bytes land on exactly the pages that need to convert, on a mostly
 * mobile market.
 *
 * Two things happen per image:
 *   1. Downscale to a sane display size (the hero renders ~600 CSS px, so
 *      1200px covers 2x displays with room to spare).
 *   2. Re-encode as WebP. sharp drops all metadata unless asked to keep it,
 *      which also strips the stale Adobe XMP packets the source exports carry.
 *
 * The original PNGs are deliberately left in place. Old image URLs are indexed
 * by Google and referenced by external pages; removing them would 404 those.
 *
 * Deliberately skipped:
 *   favicon.png              browsers want PNG/ICO here
 *   og-image.png             some social crawlers still do not accept WebP
 *   retralabs-payment-qr.png lossy encoding risks scannability
 *
 * Run with: npm run optimize-images
 */
import { readdir, stat } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

const SKIP = new Set(['favicon.png', 'og-image.png', 'retralabs-payment-qr.png']);

interface Job { dir: string; maxSize: number; quality: number; label: string }

const JOBS: Job[] = [
  // Product shots: photographic, on a flat background.
  { dir: PUBLIC, maxSize: 1200, quality: 82, label: 'product' },
  // Review screenshots: contain small text, so they need a higher quality
  // floor than photographs before the type goes mushy.
  { dir: join(PUBLIC, 'testimonials'), maxSize: 900, quality: 86, label: 'testimonial' },
];

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)}KB`;

async function run() {
  let before = 0;
  let after = 0;
  let count = 0;

  for (const job of JOBS) {
    const entries = await readdir(job.dir, { withFileTypes: true });
    const images = entries
      .filter(e => e.isFile() && /\.(png|jpe?g)$/i.test(e.name) && !SKIP.has(e.name))
      .map(e => e.name)
      .sort();

    console.log(`\n[images] ${job.label} — ${images.length} file(s) in ${job.dir.replace(ROOT, '.')}`);

    for (const name of images) {
      const src = join(job.dir, name);
      const out = join(job.dir, `${basename(name, extname(name))}.webp`);

      const srcSize = (await stat(src)).size;
      const meta = await sharp(src).metadata();

      // withMetadata() is NOT called, so EXIF/XMP/IPTC are dropped.
      const info = await sharp(src)
        .resize({
          width: Math.min(meta.width ?? job.maxSize, job.maxSize),
          height: Math.min(meta.height ?? job.maxSize, job.maxSize),
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: job.quality, effort: 6 })
        .toFile(out);

      before += srcSize;
      after += info.size;
      count += 1;

      const saved = Math.round((1 - info.size / srcSize) * 100);
      console.log(
        `  ${name.padEnd(28)} ${kb(srcSize).padStart(7)} -> ${kb(info.size).padStart(7)}  (-${saved}%)  ${info.width}x${info.height}`,
      );
    }
  }

  console.log(
    `\n[images] ${count} converted. ${kb(before)} -> ${kb(after)} ` +
    `(-${Math.round((1 - after / before) * 100)}%). Original files kept.`,
  );
}

run().catch(err => {
  console.error('[images] failed:', err);
  process.exit(1);
});
