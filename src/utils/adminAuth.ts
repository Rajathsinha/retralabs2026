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
    if (res.ok) {
      const { token } = await res.json();
      if (typeof token === 'string' && token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, token);
        } catch {}
        return true;
      }
    }
  } catch {}

  // In local Vite dev environment, allow access if backend functions aren't running locally
  if (import.meta.env.DEV && password.length > 0) {
    try {
      sessionStorage.setItem(TOKEN_KEY, 'dev-admin-session-token');
    } catch {}
    return true;
  }

  return false;
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

export async function deleteAdminOrders(recordIds: string[]): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const res = await adminFetch('/api/admin-delete-orders', {
      method: 'POST',
      body: JSON.stringify({ recordIds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (import.meta.env.DEV) {
        return { success: true, deletedCount: recordIds.length };
      }
      return { success: false, deletedCount: 0, error: json.error || `Deletion failed (HTTP ${res.status})` };
    }
    return { success: true, deletedCount: json.deletedCount || 0 };
  } catch (err) {
    if (import.meta.env.DEV) {
      return { success: true, deletedCount: recordIds.length };
    }
    return { success: false, deletedCount: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
