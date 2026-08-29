export interface AirtableAttachment {
  url: string;
  thumbnails?: { small?: { url: string } };
}

export interface AirtableRecord {
  id: string;
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
  delivery: string;
  referral: string;
  customer: string;
  trackingId: string;
  dateFrom: string;
  dateTo: string;
}
