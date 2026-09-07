import { requireAdmin } from './admin-auth';
import { corsHeaders, getAirtableConfig } from './order-shared';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // Admin-only check
  const denied = await requireAdmin(event);
  if (denied) return denied;

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    let payload: {
      updates?: Array<{ id: string; fields: Record<string, unknown> }>;
      recordId?: string;
      fields?: Record<string, unknown>;
    } = {};

    try {
      payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    } catch {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON payload' }),
      };
    }

    let updates: Array<{ id: string; fields: Record<string, unknown> }> = [];
    if (Array.isArray(payload.updates)) {
      updates = payload.updates.filter((u) => u && typeof u.id === 'string' && u.fields && typeof u.fields === 'object');
    } else if (payload.recordId && payload.fields) {
      updates = [{ id: payload.recordId, fields: payload.fields }];
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No valid updates provided' }),
      };
    }

    const { token, baseId, table } = getAirtableConfig();
    if (!token || !baseId) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Airtable is not configured on the server' }),
      };
    }

    let totalUpdated = 0;
    const failedBatches: { ids: string[]; error: string }[] = [];

    // Airtable limits batch updates to 10 records per request
    for (let i = 0; i < updates.length; i += 10) {
      const chunk = updates.slice(i, i + 10);
      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;

      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: chunk,
            typecast: true,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || errJson?.error || `Airtable HTTP ${res.status}`;
          console.error(`[AdminUpdateOrders] Batch error: ${errMsg}`);
          failedBatches.push({ ids: chunk.map((c) => c.id), error: errMsg });
        } else {
          const resJson = await res.json().catch(() => ({}));
          const count = Array.isArray(resJson.records) ? resJson.records.length : chunk.length;
          totalUpdated += count;
        }
      } catch (batchErr) {
        const errMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
        console.error(`[AdminUpdateOrders] Network error: ${errMsg}`);
        failedBatches.push({ ids: chunk.map((c) => c.id), error: errMsg });
      }
    }

    return {
      statusCode: failedBatches.length > 0 && totalUpdated === 0 ? 502 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: totalUpdated > 0,
        updatedCount: totalUpdated,
        failedCount: updates.length - totalUpdated,
        failedBatches: failedBatches.length > 0 ? failedBatches : undefined,
      }),
    };
  } catch (err) {
    console.error('[AdminUpdateOrders] Fatal error:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
    };
  }
};
