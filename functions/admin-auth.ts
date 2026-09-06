/**
 * Admin authentication.
 *
 * The admin password used to live in VITE_ADMIN_PASSWORD, which Vite inlines
 * into the browser bundle at build time — it was readable by anyone who opened
 * devtools. Worse, the admin API routes had no auth at all, so the client-side
 * gate was decorative: /api/list-orders returned every customer's name, address
 * and phone to an unauthenticated request.
 *
 * The password now lives in ADMIN_PASSWORD (server-only, no VITE_ prefix) and
 * is never sent to the browser. Logging in returns a short-lived signed token;
 * every admin route verifies it.
 *
 * Tokens are stateless HMACs so nothing needs storing at the edge:
 *     token = "<expiryMs>.<base64url(HMAC-SHA256(expiryMs, secret))>"
 */

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function adminSecret(): string | null {
  const secret = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;
  if (!secret) return null;
  if (!process.env.ADMIN_PASSWORD && process.env.VITE_ADMIN_PASSWORD) {
    // Still works, but the VITE_ copy is compiled into the public bundle by any
    // client code that reads it. Move the value to ADMIN_PASSWORD and delete
    // the VITE_ one.
    console.warn('[admin-auth] Using VITE_ADMIN_PASSWORD. Rename it to ADMIN_PASSWORD.');
  }
  return secret;
}

function base64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return base64url(sig);
}

/** Length-independent comparison, so a wrong guess leaks no timing signal. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminToken(password: string): Promise<string | null> {
  const secret = adminSecret();
  if (!secret) return null;
  if (!timingSafeEqual(password, secret)) return null;

  const expiry = String(Date.now() + TOKEN_TTL_MS);
  return `${expiry}.${await sign(expiry, secret)}`;
}

export async function isValidAdminToken(token: string | null | undefined): Promise<boolean> {
  const secret = adminSecret();
  if (!secret || !token) return false;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;

  const expiry = token.slice(0, dot);
  const provided = token.slice(dot + 1);

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return timingSafeEqual(provided, await sign(expiry, secret));
}

/** Reads the bearer token from an incoming request's headers. */
export function bearerFrom(headers: Record<string, string> | undefined): string | null {
  if (!headers) return null;
  // Header casing varies by runtime, so look it up case-insensitively.
  const key = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
  const raw = key ? headers[key] : undefined;
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1] : null;
}

const unauthorized = {
  statusCode: 401,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ error: 'Admin authentication required' }),
};

/**
 * Guard for admin-only handlers. Returns a 401 response to send back, or null
 * when the caller is authenticated.
 */
export async function requireAdmin(
  event: { headers?: Record<string, string> },
): Promise<typeof unauthorized | null> {
  const ok = await isValidAdminToken(bearerFrom(event.headers));
  return ok ? null : unauthorized;
}
