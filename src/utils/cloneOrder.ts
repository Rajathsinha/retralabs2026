import type { AirtableRecord } from '../components/admin/types';

/**
 * Turns an existing order into the pasted-address text the manual order form
 * parses, so a repeat order for the same customer starts already filled in.
 *
 * Deliberately carries the customer across and nothing else — a repeat order
 * is the same person buying something different, so items, totals and payment
 * are left for the admin to choose rather than inherited from a months-old
 * order and quietly shipped again at a stale price.
 */
export function buildCloneText(record: AirtableRecord): string {
  const f = record.fields;
  const name = String(f['Name'] ?? '').trim();
  const phone = String(f['Phone'] ?? '').trim();
  const address = String(f['Address'] ?? '').trim().replace(/\s*\n+\s*/g, ', ');

  // Matches the "TO," block shape parseBulkAddressText expects.
  return ['TO,', name, address, phone].filter(Boolean).join('\n');
}

/** Everything the clone flow needs to describe what it is about to repeat. */
export interface CloneSeed {
  text: string;
  customerName: string;
  sourceOrderId: string;
  /** Carried only as a starting suggestion for the admin, never auto-applied. */
  suggestedPaymentMethod: 'prepay' | 'cod';
  suggestedDeliveryOption: 'normal' | 'fast';
}

export function buildCloneSeed(record: AirtableRecord): CloneSeed {
  const f = record.fields;
  const isCod = String(f['Payment'] ?? '').toUpperCase().includes('COD');
  const isExpress = String(f['Delivery'] ?? '').toLowerCase().includes('express');

  return {
    text: buildCloneText(record),
    customerName: String(f['Name'] ?? 'this customer').trim() || 'this customer',
    sourceOrderId: String(f['orderID'] ?? '').trim(),
    suggestedPaymentMethod: isCod ? 'cod' : 'prepay',
    suggestedDeliveryOption: isExpress ? 'fast' : 'normal',
  };
}
