import { BUSINESS_NAP } from '../constants/config';

export function getLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${BUSINESS_NAP.url}/#localbusiness`,
    name: BUSINESS_NAP.name,
    url: BUSINESS_NAP.url,
    telephone: BUSINESS_NAP.phone,
    email: BUSINESS_NAP.email,
    image: `${BUSINESS_NAP.url}/favicon.png`,
    priceRange: '$$',
    currenciesAccepted: 'INR',
    paymentAccepted: 'UPI, Bank Transfer, Cash on Delivery',
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS_NAP.address.city,
      addressRegion: BUSINESS_NAP.address.state,
      postalCode: BUSINESS_NAP.address.postalCode,
      addressCountry: BUSINESS_NAP.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS_NAP.geo.latitude,
      longitude: BUSINESS_NAP.geo.longitude,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: BUSINESS_NAP.hours.open,
      closes: BUSINESS_NAP.hours.close,
    },
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function getServiceAreaSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Research Peptide Supply',
    provider: {
      '@type': 'LocalBusiness',
      name: BUSINESS_NAP.name,
      url: BUSINESS_NAP.url,
    },
    areaServed: [
      { '@type': 'City', name: 'Bengaluru' },
      { '@type': 'City', name: 'Mumbai' },
      { '@type': 'City', name: 'Delhi' },
      { '@type': 'City', name: 'Chennai' },
      { '@type': 'City', name: 'Hyderabad' },
      { '@type': 'City', name: 'Pune' },
      { '@type': 'City', name: 'Kolkata' },
      { '@type': 'City', name: 'Ahmedabad' },
      { '@type': 'State', name: 'Karnataka' },
      { '@type': 'State', name: 'Maharashtra' },
      { '@type': 'State', name: 'Tamil Nadu' },
      { '@type': 'State', name: 'Telangana' },
      { '@type': 'Country', name: 'India' },
    ],
    description: 'HPLC-verified research peptides shipped across India with temperature-controlled packaging.',
  };
}
