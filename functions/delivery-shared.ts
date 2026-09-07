/**
 * Shipping routing rules.
 *
 * Business rules this encodes:
 *  1. Every Indian PIN code is deliverable. Checkout is never blocked on a PIN.
 *  2. Innofulfill serviceability decides EXPRESS eligibility only. If Innofulfill
 *     serves the PIN, Express may be offered and the order books with Innofulfill
 *     for a real AWB. If not, Express is hidden and the order goes to Shiprocket.
 *  3. Shiprocket orders land in the Shiprocket dashboard. Shiprocket does not
 *     return an AWB at that point, so the order carries no AWB until one is
 *     assigned there — the customer is told Shiprocket is handling it rather
 *     than shown a blank tracking number.
 *
 * There is deliberately no PIN → city/state lookup here. The customer picks the
 * state from a closed list and types their city.
 */

import { getInnofulfillToken } from './order-shared';

/**
 * Official states and union territories. Duplicated from
 * src/data/indianStates.ts on purpose: the Pages Functions bundle is built
 * separately, and the server must not depend on client code to decide what is
 * valid. Keep the two in step when the official list changes (rare).
 */
const REGION_NAMES: readonly string[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

const ALIASES: Record<string, string> = {
  orissa: 'Odisha',
  pondicherry: 'Puducherry',
  uttaranchal: 'Uttarakhand',
  'new delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'jammu kashmir': 'Jammu and Kashmir',
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  tamilnadu: 'Tamil Nadu',
  chattisgarh: 'Chhattisgarh',
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/[.,'’&]/g, '').replace(/\s+/g, ' ').trim();
}

const BY_NORMALISED = new Map<string, string>(REGION_NAMES.map(n => [normalise(n), n]));

export function canonicalRegion(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const key = normalise(value);
  if (!key) return undefined;
  const direct = BY_NORMALISED.get(key);
  if (direct) return direct;
  const alias = ALIASES[key];
  if (alias) return alias;
  for (const [n, canonical] of BY_NORMALISED) {
    if (key.startsWith(`${n} `) || n.startsWith(`${key} `)) return canonical;
  }
  return undefined;
}

/** A syntactically valid Indian PIN: six digits, first digit 1-9. */
export const PINCODE_RE = /^[1-9][0-9]{5}$/;

export function isValidPincodeFormat(pincode: unknown): pincode is string {
  return typeof pincode === 'string' && PINCODE_RE.test(pincode.trim());
}

/* ── Express eligibility / carrier routing ──────────────────────────────── */

export type Provider = 'Innofulfill' | 'Shiprocket';

export interface CarrierStatus {
  name: string;
  serviceable: boolean;
  reason?: string;
}

export interface RoutingDecision {
  /** Innofulfill serves this PIN, so Express may be offered. */
  expressAvailable: boolean;
  /** Who should receive the shipment. Never null — Shiprocket is the floor. */
  provider: Provider;
  /** True when Innofulfill could not be reached, so this is a fallback guess. */
  indeterminate: boolean;
  reason?: string;
  /** Every carrier Innofulfill reported, for diagnosing routing decisions. */
  carriers?: CarrierStatus[];
}

function innofulfillBase(): string {
  const sandbox = (process.env.INNOFULFILL_ENV || process.env.INNOFULFILL_SANDBOX || '')
    .toLowerCase() === 'sandbox';
  return sandbox ? 'https://sandbox.apis.innofulfill.com' : 'https://apis.innofulfill.com';
}

/**
 * Asks Innofulfill whether it serves this PIN.
 *
 * Throws on transport or auth failure so the caller can distinguish "Innofulfill
 * says no" from "we could not ask Innofulfill".
 */
export async function innofulfillServiceable(
  token: string,
  toPincode: string,
  paymentMode: 'PREPAID' | 'COD',
): Promise<{ serviceable: boolean; reason?: string; carriers: CarrierStatus[] }> {
  const fromPincode = process.env.INNOFULFILL_PICKUP_PINCODE || '560016';
  // Only narrow to a specific carrier when one is explicitly configured.
  // Sending a carrier name that matches nothing makes Innofulfill answer with
  // no serviceable carriers, which then reads to the customer as "we do not
  // deliver there" even for PIN codes it plainly serves.
  const carrier = (process.env.INNOFULFILL_CARRIER_NAME || '').trim();

  const payload: Record<string, unknown> = {
    fromPincode: parseInt(fromPincode, 10),
    toPincode: parseInt(toPincode, 10),
    paymentMode,
    operationType: 'PICKUP_DELIVERY',
  };
  if (carrier) payload.carriers = [carrier];

  const res = await fetch(`${innofulfillBase()}/gateway/serviceability/ecomm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      TenantId: process.env.INNOFULFILL_TENANT_ID || '',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Innofulfill serviceability HTTP ${res.status}`);
  const json = await res.json();

  // Flatten every carrier across every returned entry. Reading only
  // data[0].carriers[0] meant a single unserviceable carrier at the head of
  // the list masked every serviceable one behind it.
  const entries: Array<Record<string, unknown>> = Array.isArray(json?.data) ? json.data : [];
  const carriers: CarrierStatus[] = entries.flatMap(entry => {
    const raw = (entry as { carriers?: unknown }).carriers;
    const list: Array<Record<string, unknown>> = Array.isArray(raw) ? raw : [];
    return list.map(c => ({
      name: String(c.carrierName ?? c.name ?? 'unknown'),
      serviceable: c.serviceable === true,
      reason: typeof c.reason === 'string' ? c.reason : undefined,
    }));
  });

  const serviceable = carriers.some(c => c.serviceable);
  console.log(
    `[routing] ${fromPincode}->${toPincode} ${paymentMode}: ` +
    `${carriers.length} carrier(s), serviceable=${serviceable} ` +
    `[${carriers.map(c => `${c.name}:${c.serviceable}`).join(', ')}]`,
  );

  return {
    serviceable,
    reason: carriers.find(c => !c.serviceable && c.reason)?.reason,
    carriers,
  };
}

/**
 * Decides the carrier for a destination.
 *
 * Innofulfill when it serves the PIN, Shiprocket otherwise. A PIN is never
 * rejected: Shiprocket is always the fallback, so the customer can always
 * complete the order.
 */
export async function routeShipment(
  pincode: string,
  paymentMethod: 'prepay' | 'cod',
): Promise<RoutingDecision> {
  if (!isValidPincodeFormat(pincode)) {
    return { expressAvailable: false, provider: 'Shiprocket', indeterminate: true, reason: 'Invalid PIN format' };
  }

  const paymentMode = paymentMethod === 'cod' ? 'COD' : 'PREPAID';

  try {
    const token = await getInnofulfillToken();
    if (!token) {
      return { expressAvailable: false, provider: 'Shiprocket', indeterminate: true, reason: 'Innofulfill not configured' };
    }
    const inno = await innofulfillServiceable(token, pincode.trim(), paymentMode);
    return inno.serviceable
      ? { expressAvailable: true, provider: 'Innofulfill', indeterminate: false, carriers: inno.carriers }
      : { expressAvailable: false, provider: 'Shiprocket', indeterminate: false, reason: inno.reason, carriers: inno.carriers };
  } catch (err) {
    // Could not ask. Ship via Shiprocket rather than blocking the sale, and
    // mark it so the caller knows Express was hidden on a guess.
    console.error('[routing] Innofulfill serviceability failed:', err);
    return {
      expressAvailable: false,
      provider: 'Shiprocket',
      indeterminate: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
