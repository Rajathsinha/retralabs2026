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
  },
} as const;
