export interface AirtableAttachment {
  url: string;
  thumbnails?: { small?: { url: string } };
}

export interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, string | number | AirtableAttachment[] | undefined>;
}

export type OrderStatus =
  | 'New'
  | 'Created in Innofulfill'
  | 'Confirmed'
  | 'Paid'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export const STATUS_OPTIONS: OrderStatus[] = [
  'New',
  'Created in Innofulfill',
  'Confirmed',
  'Paid',
  'Shipped',
  'Delivered',
  'Cancelled',
];

export const PAYMENT_OPTIONS = ['COD', 'UPI', 'UPI/Prepay', 'UPI QR'] as const;
export const DELIVERY_OPTIONS = ['Express', 'Standard'] as const;

export interface StatCardData {
  key: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  change: number;
  spark: number[];
}

export interface AdminFilters {
  search: string;
  status: string;
  payment: string;
  paymentStatus: string;
  delivery: string;
  referral: string;
  customer: string;
  trackingId: string;
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  product: string;
  minAmount: string;
  maxAmount: string;
  city: string;
  customerType: string; // 'all' | 'first' | 'repeat'
  fulfillmentStatus: string; // 'all' | 'needs_action' | 'unfulfilled' | 'fulfilled' | 'in_transit'
}

export interface SenderConfig {
  name: string;
  phone: string;
  addressLines: string[];
  returnNotice: string;
}

export type AnalyticsTimeframe = '7d' | '15d' | '30d' | 'quarter' | 'ytd' | 'all' | 'custom';
