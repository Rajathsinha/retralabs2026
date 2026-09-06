import { createAdminToken } from './admin-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * Exchanges the admin password for a short-lived signed token.
 *
 * The password is compared server-side and never reaches the browser. A wrong
 * password gets a flat 401 with no detail about why.
 */
export const handler = async (event: { httpMethod?: string; body?: string }) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password } = JSON.parse(event.body || '{}') as { password?: string };
    if (typeof password !== 'string' || !password) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid password' }) };
    }

    const token = await createAdminToken(password);
    if (!token) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid password' }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ token }) };
  } catch {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid password' }) };
  }
};
