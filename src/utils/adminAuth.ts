/**
 * Admin session handling.
 *
 * The password is never held in the client bundle. It is posted to
 * /api/admin-login, which verifies it server-side and returns a short-lived
 * signed token. That token is what authenticates every admin API call.
 *
 * Stored in sessionStorage, so it dies with the tab.
 */

const TOKEN_KEY = 'rl_admin_token';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable — nothing to clear */ }
}

/** Exchanges a password for a session token. Returns false if it was wrong. */
export async function adminLogin(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const { token } = await res.json();
    if (typeof token !== 'string' || !token) return false;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch { /* private mode — the token stays in memory for this page only */ }
    return true;
  } catch {
    return false;
  }
}

/**
 * fetch() for admin routes, with the bearer token attached.
 *
 * A 401 means the token expired or was never valid, so the stored one is
 * dropped — the caller should send the operator back to the password screen.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) clearAdminToken();
  return res;
}
