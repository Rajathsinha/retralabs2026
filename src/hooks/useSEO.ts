import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  schema?: object | object[];
}

function setMeta(selector: string, attr: string, attrValue: string, content: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSEO({ title, description, keywords, canonical, ogImage, schema }: SEOProps) {
  useEffect(() => {
    // ── Title
    document.title = title;

    // ── Meta tags
    setMeta('meta[name="description"]',         'name',     'description',         description);
    setMeta('meta[property="og:title"]',        'property', 'og:title',            title);
    setMeta('meta[property="og:description"]',  'property', 'og:description',      description);
    setMeta('meta[name="twitter:title"]',       'name',     'twitter:title',       title);
    setMeta('meta[name="twitter:description"]', 'name',     'twitter:description', description);

    if (keywords) {
      setMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
    }
    if (ogImage) {
      setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
    }

    // ── Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // ── Structured data (page-specific, injected fresh per route)
    if (schema) {
      document.querySelectorAll('script[data-page-schema]').forEach(el => el.remove());
      const schemas = Array.isArray(schema) ? schema : [schema];
      schemas.forEach(s => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-page-schema', 'true');
        script.textContent = JSON.stringify(s);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.querySelectorAll('script[data-page-schema]').forEach(el => el.remove());
    };
  }, [title, description, keywords, canonical, ogImage, JSON.stringify(schema)]);
}
