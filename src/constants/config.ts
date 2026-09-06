export const WHATSAPP_NUMBER = '918217824384';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export const BUSINESS_NAP = {
  name: 'RetraLabs',
  legalName: 'RetraLabs Research Supplies',
  url: 'https://retralabs.in',
  email: 'support@retralabs.in',
  phone: '+91-8217824384',
  phoneRaw: '+918217824384',
  address: {
    street: 'Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'IN',
    formatted: 'Bengaluru, Karnataka 560001, India',
  },
  geo: {
    latitude: 12.9716,
    longitude: 77.5946,
  },
  hours: {
    days: 'Mo-Sa',
    open: '09:00',
    close: '18:00',
    display: 'Mon-Sat: 9:00 AM - 6:00 PM IST',
  },
  social: {
    trustpilot: 'https://www.trustpilot.com/review/retralabs.in',
    reddit: 'https://www.reddit.com/r/retralabs/',
    indiamart: 'https://www.indiamart.com/retralabs-bengaluru/profile.html?srsltid=AfmBOoqGPtMQQN_bMb77devHIjxqtjn10SpBhMHTVvW6W0nyhHhLZdFS',
  },
} as const;

/**
 * RetraLabs' Trustpilot company rating.
 *
 * These are real figures read off the public profile, not estimates — update
 * `rating`, `reviewCount` and `verifiedOn` together whenever you recheck
 * https://www.trustpilot.com/review/retralabs.in. Every surface that shows a
 * Trustpilot score reads from here, so there is one place to change.
 *
 * We render the score ourselves rather than embedding a Trustpilot TrustBox:
 * TrustBox widgets depend on the Trustpilot plan attached to the account and
 * silently degrade to a bare "Trustpilot" text link when unavailable.
 *
 * This is the COMPANY rating. It must never be used as a per-product rating,
 * and must not be emitted as Product/aggregateRating structured data.
 */
export const TRUSTPILOT = {
  rating: 4.6,
  bestRating: 5,
  reviewCount: 58,
  verifiedOn: '2026-09-06',
  url: 'https://www.trustpilot.com/review/retralabs.in',
} as const;
