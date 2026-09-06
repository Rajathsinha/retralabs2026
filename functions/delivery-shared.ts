/**
 * Server-side PIN verification and delivery routing.
 *
 * This module is the source of truth. The checkout calls it for live feedback,
 * and create-order calls it again before an order is written, so a crafted or
 * stale request cannot bypass the routing or buy an undeliverable address.
 * Never accept the client's state, city, serviceability or provider.
 *
 * The region list is deliberately duplicated from src/data/indianStates.ts
 * rather than imported: the Pages Functions bundle is built separately from the
 * app, and the server must not depend on client code to decide what is valid.
 * Keep the two lists in step when the official list changes (rare).
 */

import { getInnofulfillToken } from './order-shared';

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

export type PinLookupStatus = 'found' | 'not_found' | 'invalid' | 'unavailable';

export interface PinLookup {
  status: PinLookupStatus;
  pincode: string;
  state?: string;
  district?: string;
  city?: string;
  /** Distinct locality names under this PIN, for the customer to recognise. */
  areas?: string[];
}

interface PostOffice {
  Name?: string;
  District?: string;
  State?: string;
  Circle?: string;
  Block?: string;
  DeliveryStatus?: string;
}

/**
 * Looks a PIN up against India Post.
 *
 * 'unavailable' is returned when the upstream is unreachable or malformed, and
 * is deliberately distinct from 'not_found' — telling a customer their real PIN
 * is invalid because an API blipped is worse than asking them to retry.
 */
export async function lookupPincode(rawPincode: string): Promise<PinLookup> {
  const pincode = String(rawPincode ?? '').trim();
  if (!isValidPincodeFormat(pincode)) {
    return { status: 'invalid', pincode };
  }

  let json: unknown;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { status: 'unavailable', pincode };
    json = await res.json();
  } catch {
    return { status: 'unavailable', pincode };
  }

  const entry = Array.isArray(json) ? (json[0] as Record<string, unknown>) : undefined;
  if (!entry) return { status: 'unavailable', pincode };

  const status = String(entry.Status ?? '');
  const offices = Array.isArray(entry.PostOffice) ? (entry.PostOffice as PostOffice[]) : [];

  if (status !== 'Success' || offices.length === 0) {
    // India Post answers "Error" / "404" with an empty PostOffice list for a
    // well-formed PIN that does not exist.
    return { status: 'not_found', pincode };
  }

  const first = offices[0];
  const state = canonicalRegion(first.State ?? first.Circle);
  if (!state) {
    // Recognised PIN but an unmappable region name — treat as unavailable so we
    // never write a state the rest of the system cannot route on.
    return { status: 'unavailable', pincode };
  }

  const district = typeof first.District === 'string' ? first.District.trim() : undefined;
  const areas = Array.from(
    new Set(offices.map(o => (typeof o.Name === 'string' ? o.Name.trim() : '')).filter(Boolean)),
  ).slice(0, 8);

  return {
    status: 'found',
    pincode,
    state,
    district,
    // India Post has no "city" field; the district is the closest reliable
    // equivalent and is what couriers expect.
    city: district,
    areas,
  };
}

/* ── Carrier serviceability ─────────────────────────────────────────────── */

export type Provider = 'Innofulfill' | 'Shiprocket';

export interface ServiceabilityResult {
  serviceable: boolean;
  provider: Provider | null;
  /** True when no carrier could be reached, as opposed to both declining. */
  indeterminate: boolean;
  reason?: string;
}

function innofulfillBase(): string {
  const sandbox = (process.env.INNOFULFILL_ENV || process.env.INNOFULFILL_SANDBOX || '')
    .toLowerCase() === 'sandbox';
  return sandbox ? 'https://sandbox.apis.innofulfill.com' : 'https://apis.innofulfill.com';
}

async function innofulfillServiceable(
  token: string,
  toPincode: string,
  paymentMode: 'PREPAID' | 'COD',
): Promise<{ serviceable: boolean; reason?: string }> {
  const fromPincode = process.env.INNOFULFILL_PICKUP_PINCODE || '560016';
  const carrier = process.env.INNOFULFILL_CARRIER_NAME || 'innofulfill_ecomm';

  const res = await fetch(`${innofulfillBase()}/gateway/serviceability/ecomm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      TenantId: process.env.INNOFULFILL_TENANT_ID || '',
    },
    body: JSON.stringify({
      fromPincode: parseInt(fromPincode, 10),
      toPincode: parseInt(toPincode, 10),
      paymentMode,
      operationType: 'PICKUP_DELIVERY',
      carriers: [carrier],
    }),
  });

  if (!res.ok) throw new Error(`Innofulfill serviceability HTTP ${res.status}`);
  const json = await res.json();
  const carrierStatus = json?.data?.[0]?.carriers?.[0];
  return {
    serviceable: carrierStatus?.serviceable === true,
    reason: carrierStatus?.reason || undefined,
  };
}

let shiprocketToken: { token: string; expiresAt: number } | null = null;

async function getShiprocketToken(): Promise<string | null> {
  const email = (process.env.SHIPROCKET_EMAIL || process.env.VITE_SHIPROCKET_EMAIL || '').trim();
  const password = (process.env.SHIPROCKET_PASSWORD || process.env.VITE_SHIPROCKET_PASSWORD || '').trim();
  if (!email || !password) return null;
  if (shiprocketToken && Date.now() < shiprocketToken.expiresAt) return shiprocketToken.token;

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Shiprocket auth HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.token) throw new Error('Shiprocket auth returned no token');
  shiprocketToken = { token: json.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return json.token;
}

async function shiprocketServiceable(
  token: string,
  toPincode: string,
  cod: boolean,
): Promise<{ serviceable: boolean }> {
  const from = process.env.SHIPROCKET_PICKUP_PINCODE || process.env.INNOFULFILL_PICKUP_PINCODE || '560016';
  const params = new URLSearchParams({
    pickup_postcode: from,
    delivery_postcode: toPincode,
    weight: '0.5',
    cod: cod ? '1' : '0',
  });
  const res = await fetch(
    `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  // Shiprocket answers 404 for an unserviceable route rather than an error body.
  if (res.status === 404) return { serviceable: false };
  if (!res.ok) throw new Error(`Shiprocket serviceability HTTP ${res.status}`);
  const json = await res.json();
  const couriers = json?.data?.available_courier_companies;
  return { serviceable: Array.isArray(couriers) && couriers.length > 0 };
}

/**
 * Decides whether we can deliver, and by whom. Innofulfill is preferred;
 * Shiprocket is the fallback.
 *
 * When a carrier call throws we record it as indeterminate rather than
 * unserviceable, so a carrier outage never silently blocks real orders — the
 * caller decides how to present that.
 */
export async function checkServiceability(
  pincode: string,
  paymentMethod: 'prepay' | 'cod',
): Promise<ServiceabilityResult> {
  const paymentMode = paymentMethod === 'cod' ? 'COD' : 'PREPAID';
  let reachedAnyCarrier = false;
  let reason: string | undefined;

  try {
    const token = await getInnofulfillToken();
    if (token) {
      const inno = await innofulfillServiceable(token, pincode, paymentMode);
      reachedAnyCarrier = true;
      if (inno.serviceable) {
        return { serviceable: true, provider: 'Innofulfill', indeterminate: false };
      }
      reason = inno.reason;
    }
  } catch (err) {
    console.error('[delivery] Innofulfill serviceability failed:', err);
  }

  try {
    const token = await getShiprocketToken();
    if (token) {
      const sr = await shiprocketServiceable(token, pincode, paymentMethod === 'cod');
      reachedAnyCarrier = true;
      if (sr.serviceable) {
        return { serviceable: true, provider: 'Shiprocket', indeterminate: false };
      }
    }
  } catch (err) {
    console.error('[delivery] Shiprocket serviceability failed:', err);
  }

  return {
    serviceable: false,
    provider: null,
    indeterminate: !reachedAnyCarrier,
    reason,
  };
}

export interface DeliveryResolution {
  pin: PinLookup;
  serviceability: ServiceabilityResult | null;
  checkedAt: string;
}

/** Full resolution: verify the PIN, then ask the carriers. */
export async function resolveDelivery(
  pincode: string,
  paymentMethod: 'prepay' | 'cod',
): Promise<DeliveryResolution> {
  const pin = await lookupPincode(pincode);
  const serviceability =
    pin.status === 'found' ? await checkServiceability(pin.pincode, paymentMethod) : null;
  return { pin, serviceability, checkedAt: new Date().toISOString() };
}
