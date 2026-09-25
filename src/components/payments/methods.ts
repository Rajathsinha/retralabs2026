/**
 * What we accept, and how each method maps onto Cashfree.
 *
 * `cashfreeCodes` are Cashfree's order_meta.payment_methods codes, so the
 * method a customer picks in our own UI is the one their checkout opens on.
 * COD has no code — it never reaches Cashfree.
 *
 * Kept apart from the mark components so a file never exports both constants
 * and components (which breaks fast refresh).
 */

export type PaymentMethodId = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod';

export interface PaymentMethodDef {
  id: PaymentMethodId;
  label: string;
  /** One short line, customer-facing. No marketing fluff. */
  blurb: string;
  cashfreeCodes: string[];
}

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { id: 'upi',        label: 'UPI',                 blurb: 'GPay, PhonePe, Paytm & any UPI app', cashfreeCodes: ['upi'] },
  { id: 'card',       label: 'Credit / Debit Card', blurb: 'Visa, Mastercard, RuPay & Amex',     cashfreeCodes: ['cc', 'dc'] },
  { id: 'netbanking', label: 'Net Banking',         blurb: 'All major Indian banks',             cashfreeCodes: ['nb'] },
  { id: 'wallet',     label: 'Wallets',             blurb: 'Paytm, Amazon Pay, Mobikwik & more', cashfreeCodes: ['app'] },
  { id: 'cod',        label: 'Cash on Delivery',    blurb: 'Pay the courier when it arrives',    cashfreeCodes: [] },
];
