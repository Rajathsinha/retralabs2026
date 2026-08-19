import { Product } from '../types';

export function productDisplayName(product: Pick<Product, 'name' | 'display_name'>): string {
  return product.display_name?.trim() || product.name;
}

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'Retatrutide': 'GLP-3 R10',
};

export function productDisplayHeading(name: string, fallback: string): string {
  const override = DISPLAY_NAME_OVERRIDES[name];
  if (!override) return fallback;
  return fallback.replace(name, override);
}

export function productDisplayText(name: string, text: string): string {
  const override = DISPLAY_NAME_OVERRIDES[name];
  if (!override) return text;
  return text.split(name).join(override);
}
