/**
 * Shiprocket client: authentication, destination resolution and order creation.
 *
 * This exists because the automatic booking path and the admin's manual
 * "Push to Shiprocket" button had drifted into two separate implementations
 * reading two different sources for the same facts. The automatic one took the
 * delivery address from the order request and worked; the manual one read
 * `City` and `State` off the Airtable record, where no such columns exist, and
 * so fell back to a hardcoded Bengaluru/Karnataka for every order. A Mumbai
 * order was pushed as "Bengaluru, Karnataka, 400008" -- a pincode that
 * contradicts its own city -- which Shiprocket rejects every time, identically,
 * however many days later you press the button.
 *
 * Both paths now resolve the destination here, from data that actually exists.
 */

import { canonicalRegion, extractPincodeFromAddress, isValidPincodeFormat } from './delivery-shared';

const SHIPROCKET_API = 'https://apiv2.shiprocket.in/v1/external';

/** Shiprocket tokens last ~10 days; refresh a day early. */
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

/**
 * How long to stop attempting login after Shiprocket refuses our credentials.
 *
 * Their login endpoint throttles, and the throttle message is "User blocked due
 * to too many failed login attempts" -- so retrying through it extends the
 * block that is causing the failure. Backing off is what ends it.
 */
const AUTH_COOLDOWN_MS = 15 * 60 * 1000;

interface TokenState {
  token: string;
  expiresAt: number;
}

/**
 * Per-isolate cache. On Cloudflare this is nearly useless on its own -- isolates
 * are created and discarded constantly, so most requests would start cold and
 * log in again, which is exactly how the account got throttled. It is kept as
 * the fastest of three layers, not as the mechanism.
 */
let memoryToken: TokenState | null = null;
let authBlockedUntil = 0;

/**
 * Cross-isolate cache, via the Workers Cache API. Needs no binding or
 * dashboard setup, and takes login from roughly once per order to once per
 * edge location per nine days.
 *
 * It is per-colo rather than global, and every call is wrapped: if the Cache
 * API is unavailable the client still works off the memory cache and the
 * cooldown, just with more logins.
 */
const TOKEN_CACHE_KEY = 'https://internal.retralabs.invalid/shiprocket-token/v1';

async function readCachedToken(): Promise<string | null> {
  try {
    const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (!cache) return null;
    const hit = await cache.match(new Request(TOKEN_CACHE_KEY));
    if (!hit) return null;
    const token = (await hit.text()).trim();
    return token || null;
  } catch {
    return null;
  }
}

async function writeCachedToken(token: string): Promise<void> {
  try {
    const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (!cache) return;
    await cache.put(
      new Request(TOKEN_CACHE_KEY),
      new Response(token, {
        headers: {
          'Cache-Control': `max-age=${Math.floor(TOKEN_TTL_MS / 1000)}`,
          'Content-Type': 'text/plain',
        },
      }),
    );
  } catch {
    /* Cache unavailable: the memory cache and cooldown still apply. */
  }
}

async function clearCachedToken(): Promise<void> {
  memoryToken = null;
  try {
    const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    await cache?.delete(new Request(TOKEN_CACHE_KEY));
  } catch {
    /* nothing to do */
  }
}

function looksThrottled(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('too many') || m.includes('blocked') || m.includes('429') || m.includes('403');
}

export class ShiprocketAuthError extends Error {
  readonly throttled: boolean;
  constructor(message: string, throttled: boolean) {
    super(message);
    this.name = 'ShiprocketAuthError';
    this.throttled = throttled;
  }
}

/**
 * Returns a usable Shiprocket token, or throws.
 *
 * Returns null only when no credentials are configured at all, which callers
 * treat as "Shiprocket is not set up" rather than as a failure to retry.
 */
export async function getShiprocketToken(): Promise<string | null> {
  const email = (process.env.SHIPROCKET_EMAIL || process.env.VITE_SHIPROCKET_EMAIL || '').trim();
  const password = (process.env.SHIPROCKET_PASSWORD || process.env.VITE_SHIPROCKET_PASSWORD || '').trim();
  if (!email || !password) return null;

  if (memoryToken && Date.now() < memoryToken.expiresAt) return memoryToken.token;

  const cached = await readCachedToken();
  if (cached) {
    memoryToken = { token: cached, expiresAt: Date.now() + TOKEN_TTL_MS };
    return cached;
  }

  if (Date.now() < authBlockedUntil) {
    const waitSec = Math.ceil((authBlockedUntil - Date.now()) / 1000);
    throw new ShiprocketAuthError(
      `Shiprocket login is in cooldown for another ${waitSec}s after a throttled attempt. ` +
        `This order will be retried automatically; no action needed.`,
      true,
    );
  }

  const res = await fetch(`${SHIPROCKET_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json().catch(() => ({}))) as { token?: string; message?: string; errors?: unknown };

  if (!res.ok || !json?.token) {
    const detail = json?.message || (json?.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`);
    const throttled = looksThrottled(detail) || res.status === 429 || res.status === 403;
    if (throttled) authBlockedUntil = Date.now() + AUTH_COOLDOWN_MS;
    throw new ShiprocketAuthError(`Shiprocket auth failed: ${detail}`, throttled);
  }

  authBlockedUntil = 0;
  memoryToken = { token: json.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  await writeCachedToken(json.token);
  return json.token;
}

/* ── Destination resolution ──────────────────────────────────────────────── */

export interface Destination {
  city: string;
  state: string;
  pincode: string;
  /** Where the values came from, for logging and for the admin's error text. */
  source: 'snapshot' | 'address';
}

/**
 * Pulls city/state/pincode off the machine-readable snapshot the checkout
 * writes to every order. Authoritative when present.
 */
function fromSnapshot(raw: unknown): Destination | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const snap = JSON.parse(raw) as { city?: string; state?: string; pincode?: string };
    const state = canonicalRegion(snap.state);
    const city = String(snap.city ?? '').trim();
    const pincode = String(snap.pincode ?? '').trim();
    if (state && city && isValidPincodeFormat(pincode)) {
      return { city, state, pincode, source: 'snapshot' };
    }
  } catch {
    /* malformed snapshot: fall through to the address */
  }
  return null;
}

/**
 * Recovers the destination from the address text, for orders placed before the
 * snapshot field existed.
 *
 * The stored format is consistently "<street parts>, <City>, <State>[, India]
 * - [PIN:] <pincode>", so this walks the comma-separated parts from the right
 * looking for the first one that is a real Indian state, and takes the part
 * before it as the city. Matching against the canonical state list rather than
 * a position means "..., India" or a missing country does not shift the answer.
 */
function fromAddress(address: string): Destination | null {
  const text = String(address ?? '').trim();
  if (!text) return null;

  const pincode = extractPincodeFromAddress(text);
  if (!isValidPincodeFormat(pincode)) return null;

  // Drop the trailing "- 673573" / "- PIN: 400008" so it cannot be read as a part.
  const withoutPin = text.replace(/[-–]\s*(PIN:?\s*)?[1-9][0-9]{5}\s*$/i, '');
  const parts = withoutPin
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 0; i--) {
    const state = canonicalRegion(parts[i]);
    if (!state) continue;
    const city = parts[i - 1]?.trim();
    if (!city) continue;
    return { city, state, pincode, source: 'address' };
  }
  return null;
}

/**
 * Works out where an order is actually going.
 *
 * Deliberately has no default. The previous code defaulted to Bengaluru,
 * Karnataka whenever it could not tell, which does not fail -- it silently
 * mislabels the parcel and then gets rejected for contradicting its own
 * pincode. An explicit error naming the order is recoverable; a wrong city is
 * not.
 */
export function resolveDestination(fields: Record<string, unknown>): Destination {
  const snapshot = fromSnapshot(fields['Order Snapshot']);
  if (snapshot) return snapshot;

  const parsed = fromAddress(String(fields['Address'] ?? ''));
  if (parsed) return parsed;

  const orderId = String(fields['orderID'] ?? 'unknown');
  throw new Error(
    `Cannot determine the delivery city and state for order ${orderId}. ` +
      `The address does not end in a recognised "City, State - PIN" form and the ` +
      `order has no snapshot. Fix the Address field in Airtable, then push again.`,
  );
}

/* ── Order creation ──────────────────────────────────────────────────────── */

export interface ShiprocketOrderResult {
  shiprocketOrderId: string;
  shiprocketShipmentId: string;
  courierName: string;
  awbNumber?: string;
  /** True when Shiprocket already held this order_id, so nothing new was created. */
  alreadyExisted: boolean;
}

export class ShiprocketOrderError extends Error {
  /** Retrying will not change the outcome -- the payload or the order is the problem. */
  readonly permanent: boolean;
  constructor(message: string, permanent: boolean) {
    super(message);
    this.name = 'ShiprocketOrderError';
    this.permanent = permanent;
  }
}

function splitName(full: string): { first: string; last: string } {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Valued', last: 'Customer' };
  if (parts.length === 1) return { first: parts[0], last: 'Customer' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function pickupLocation(): string {
  const raw = (process.env.SHIPROCKET_PICKUP_LOCATION || process.env.VITE_SHIPROCKET_PICKUP_LOCATION || 'Rajath').trim();
  return !raw || raw.toLowerCase() === 'primary' ? 'Rajath' : raw;
}

export interface BuildPayloadInput {
  orderId: string;
  orderDate: Date;
  name: string;
  email: string;
  phone: string;
  address: string;
  destination: Destination;
  /** The amount declared to the carrier, not necessarily what the customer paid. */
  declaredValue: number;
  isCod: boolean;
  /** For COD, the amount the courier must actually collect. */
  codCollectible?: number;
}

export function buildShiprocketPayload(input: BuildPayloadInput): Record<string, unknown> {
  const { first, last } = splitName(input.name);
  const d = input.orderDate;
  const pad = (n: number) => String(n).padStart(2, '0');
  const orderDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return {
    order_id: input.orderId,
    order_date: orderDate,
    pickup_location: pickupLocation(),
    channel_id: '',
    comment: 'RetraLabs Order',
    billing_customer_name: first,
    billing_last_name: last,
    billing_address: input.address || 'Address Line 1',
    billing_city: input.destination.city,
    billing_state: input.destination.state,
    billing_pincode: input.destination.pincode,
    billing_country: 'India',
    billing_email: input.email || 'orders@retralabs.in',
    billing_phone: String(input.phone || '').replace(/\D/g, '').slice(-10) || '9999999999',
    shipping_is_billing: true,
    order_items: [
      {
        name: 'Cosmetic Research use',
        sku: 'RETRA-CR-01',
        units: 1,
        selling_price: input.declaredValue,
        discount: 0,
        tax: 0,
      },
    ],
    payment_method: input.isCod ? 'COD' : 'Prepaid',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: input.isCod && input.codCollectible ? input.codCollectible : input.declaredValue,
    length: 10,
    breadth: 10,
    height: 5,
    weight: 0.5,
  };
}

function alreadyExistsMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('already exist') || m.includes('duplicate');
}

/**
 * Creates the order in Shiprocket.
 *
 * Treats "order already exists" as success rather than an error: it means a
 * previous attempt reached Shiprocket even though we failed to record it, and
 * reporting it as a failure is what makes an order look permanently stuck while
 * sitting in the dashboard all along.
 */
export async function createShiprocketOrder(
  token: string,
  payload: Record<string, unknown>,
): Promise<ShiprocketOrderResult> {
  const res = await fetch(`${SHIPROCKET_API}/orders/create/adhoc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  const data: Record<string, any> = json?.data || json;
  const srOrderId = String(data?.order_id ?? json?.order_id ?? json?.id ?? '');
  const srShipmentId = String(data?.shipment_id ?? json?.shipment_id ?? '');

  const failed = !res.ok || json?.status_code === 0 || !srOrderId;
  if (failed) {
    const detail =
      json?.message ||
      (json?.errors ? JSON.stringify(json.errors) : '') ||
      `HTTP ${res.status}`;

    if (alreadyExistsMessage(String(detail))) {
      return {
        shiprocketOrderId: String(payload.order_id ?? ''),
        shiprocketShipmentId: '',
        courierName: 'Shiprocket',
        alreadyExisted: true,
      };
    }

    // A 401 means the token we had is no longer good; drop it so the next
    // attempt logs in again rather than replaying a dead token.
    if (res.status === 401) await clearCachedToken();

    // 4xx other than 401/429 is the payload being wrong -- retrying it
    // unchanged produces the same answer, so say so rather than queueing it.
    const permanent = res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429;
    throw new ShiprocketOrderError(`Shiprocket: ${detail}`, permanent);
  }

  const rawAwb = json?.awb_code || data?.awb_code;
  const awbNumber = rawAwb ? String(rawAwb).trim() : undefined;
  const courierName = String(json?.courier_name || data?.courier_name || 'Shiprocket');

  return {
    shiprocketOrderId: srOrderId,
    shiprocketShipmentId: srShipmentId,
    courierName,
    awbNumber: awbNumber || undefined,
    alreadyExisted: false,
  };
}
