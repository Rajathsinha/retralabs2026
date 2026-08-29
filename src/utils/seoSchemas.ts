import { getBreadcrumbSchema } from '../utils/localSeoSchemas';
import { CATEGORIES } from '../data/seoData';

export function getItemListSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function getArticleSchema(opts: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    author: { '@type': 'Organization', name: 'RetraLabs' },
    publisher: {
      '@type': 'Organization',
      name: 'RetraLabs',
      url: 'https://retralabs.in',
    },
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
  };
}

export function getCollectionPageSchema(name: string, url: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    description,
  };
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: 'https://retralabs.in',
    name: 'RetraLabs',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://retralabs.in/catalogue?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getCategorySchema(slug: string) {
  const cat = CATEGORIES.find(c => c.slug === slug);
  if (!cat) return undefined;
  const url = `https://retralabs.in/category/${slug}`;
  return [
    getCollectionPageSchema(cat.h1, url, cat.description),
    getBreadcrumbSchema([
      { name: 'Home', url: 'https://retralabs.in/' },
      { name: 'Catalogue', url: 'https://retralabs.in/catalogue' },
      { name: cat.label, url },
    ]),
    getItemListSchema(
      cat.productIds.map((id, i) => ({
        name: `Product ${id}`,
        url: `https://retralabs.in/product/${id}`,
      }))
    ),
  ];
}

export function getGuideSchema(slug: string) {
  return undefined;
}
