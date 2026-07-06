const { join } = require('path');

/**
 * Keep the downloaded Chrome inside node_modules/.cache so Netlify's
 * dependency cache persists it between builds (no re-download every deploy).
 */
module.exports = {
  cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer'),
};
