import { requireAdmin } from './admin-auth';
import { corsHeaders, getAirtableConfig } from './order-shared';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // Admin-only check
  const denied = await requireAdmin(event);
  if (denied) return denied;

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    let payload: { recordIds?: string[]; recordId?: string } = {};
    try {
      payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    } catch {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON payload' }),
      };
    }

    const rawIds = payload.recordIds || (payload.recordId ? [payload.recordId] : []);
    const recordIds = Array.from(new Set(rawIds.map((id) => String(id).trim()).filter(Boolean)));

    if (recordIds.length === 0) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No valid record IDs provided for deletion' }),
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

    const deletedIds: string[] = [];
    const failedBatches: { ids: string[]; error: string }[] = [];

    // Airtable REST API limits record deletion to up to 10 records per request
    for (let i = 0; i < recordIds.length; i += 10) {
      const chunk = recordIds.slice(i, i + 10);
      const queryParams = chunk.map((id) => `records[]=${encodeURIComponent(id)}`).join('&');
      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${queryParams}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data: any = await res.json().catch(() => ({}));
        const records = data.records || [];
        records.forEach((r: any) => {
          if (r.deleted) deletedIds.push(r.id);
        });
      } else {
        const errText = await res.text().catch(() => 'Airtable deletion request failed');
        failedBatches.push({ ids: chunk, error: errText });
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        deletedCount: deletedIds.length,
        deletedIds,
        failedBatches,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
