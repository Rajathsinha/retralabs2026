import { Product } from '../types';

/**
 * Display label for a product.
 *
 * Products may carry an optional `display_name` to show something other than
 * their catalogue `name`. Nothing uses it today — Retatrutide is listed and
 * shown under its real compound name — but the field stays supported so a
 * product can be relabelled without touching every render site.
 */
export function productDisplayName(product: Pick<Product, 'name' | 'display_name'>): string {
  return product.display_name?.trim() || product.name;
}
