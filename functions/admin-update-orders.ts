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
      // Mutated in place if a field turns out not to exist in the base —
      // stripped and retried rather than failing the whole chunk (which
      // would otherwise also block every other field in the same save,
      // e.g. losing a Name/Phone/Email edit just because a Pincode column
      // doesn't exist yet).
      const chunk = updates.slice(i, i + 10).map((u) => ({ id: u.id, fields: { ...u.fields } }));
      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;

      try {
        let lastErrMsg = '';
        let ok = false;
        for (let attempt = 0; attempt < 5; attempt++) {
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

          if (res.ok) {
            const resJson = await res.json().catch(() => ({}));
            const count = Array.isArray(resJson.records) ? resJson.records.length : chunk.length;
            totalUpdated += count;
            ok = true;
            break;
          }

          const errJson = await res.json().catch(() => ({}));
          lastErrMsg = errJson?.error?.message || errJson?.error || `Airtable HTTP ${res.status}`;
          const unknownMatch = String(lastErrMsg).match(/Unknown field name: ["']?([^"')]+)["']?/i);
          if (unknownMatch) {
            for (const rec of chunk) delete rec.fields[unknownMatch[1]];
            continue;
          }
          break;
        }

        if (!ok) {
          console.error(`[AdminUpdateOrders] Batch error: ${lastErrMsg}`);
          failedBatches.push({ ids: chunk.map((c) => c.id), error: lastErrMsg });
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
