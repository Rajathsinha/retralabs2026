import { Product } from '../types';

export function productDisplayName(product: Pick<Product, 'name' | 'display_name'>): string {
  return product.display_name?.trim() || product.name;
}
