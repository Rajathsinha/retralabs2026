import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = 'http://localhost:8788';
const ARTIFACTS = '/opt/cursor/artifacts';

async function screenshot(page: puppeteer.Page, name: string) {
  const path = `${ARTIFACTS}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`Saved ${path}`);
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Track page UI
  await page.goto(`${BASE}/track`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('h1');
  const trackText = await page.evaluate(() => document.body.innerText);
  console.log('Track page has RETR placeholder:', trackText.includes('RETR0000000035'));
  console.log('Track page has fake STATUS_FLOW:', trackText.includes('Order Placed') && trackText.includes('Out for Delivery'));
  await screenshot(page, 'track-order-page-form');

  // Checkout payment UI flow (stay in same SPA session so cart persists)
  await page.goto(`${BASE}/product/1`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Add to Cart'));
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Proceed to Checkout'));
    btn?.click();
  });
  await page.waitForFunction(() => window.location.pathname.includes('/checkout'), { timeout: 10000 });
  await page.waitForSelector('input[placeholder="Enter your full name"]', { timeout: 10000 });
  await page.type('input[placeholder="Enter your full name"]', 'Test Customer');
  await page.type('input[placeholder="you@email.com"]', 'test@example.com');
  await page.type('input[placeholder="+91 XXXXX XXXXX"]', '9876543210');
  await page.type('textarea[placeholder="Full shipping address with PIN code"]', '123 Test Street, Bangalore 560001');
  await page.type('input[placeholder="City"]', 'Bangalore');
  await page.type('input[placeholder="State"]', 'Karnataka');
  await page.type('input[placeholder="6-digit PIN code"]', '560001');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Google');
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 300));
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const cb of checkboxes) {
    await cb.click();
  }
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button[type="submit"]')).find((b) => b.textContent?.includes('Review & Place Order'));
    btn?.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes('Review & Pay'), { timeout: 10000 }).catch(() => {});

  const reviewText = await page.evaluate(() => document.body.innerText);
  console.log('Checkout review has 5-min window:', reviewText.includes('5-min window'));
  console.log('Checkout review has Already paid:', reviewText.includes('Already paid'));
  await screenshot(page, 'checkout-review-payment-section');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Pay via UPI QR'));
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  const modalText = await page.evaluate(() => document.body.innerText);
  console.log('Modal has Already Paid:', modalText.includes("I've Already Paid"));
  console.log('Modal has 5:00 countdown:', /5:00|4:5\d|4:\d\d/.test(modalText));
  await screenshot(page, 'upi-qr-modal-with-already-paid');

  await browser.close();
  console.log('UI smoke tests complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
