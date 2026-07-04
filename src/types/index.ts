export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  dosage_mg: number;
  price_inr: number;
  in_stock: boolean;
  vial_configuration?: string;
  is_recommended?: boolean;
  badge_text?: string;
  created_at: string;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface OrderFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  pincode: string;
  disclaimer_accepted: boolean;
  age_confirmed: boolean;
  no_dosing_accepted: boolean;
  referral_source: string;
  delivery_option: 'normal' | 'fast';
}
