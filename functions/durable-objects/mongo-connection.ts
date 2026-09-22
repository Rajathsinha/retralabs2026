/**
 * Durable Object holding a single persistent MongoDB connection.
 *
 * Cloudflare Workers cannot cheaply open a fresh TCP+TLS connection to
 * MongoDB Atlas on every request — a cold connection costs ~300ms. A
 * Durable Object gives every request in this Cloudflare location the same
 * long-lived instance, so the MongoClient connects once and stays warm;
 * subsequent queries only pay the query latency itself (tens of ms), not a
 * fresh handshake every time. This is the entire reason this class exists —
 * a plain per-request `new MongoClient(...).connect()` would defeat the
 * point of moving off Airtable for speed.
 *
 * Every route handler that needs Mongo talks to this DO through
 * mongo-shared.ts's callMongo() — nothing else in this codebase should
 * import the `mongodb` driver directly.
 *
 * Requires (wrangler.toml): a `MONGO_CONNECTION` Durable Object binding
 * pointing at this class, plus `MONGODB_URI` / `MONGODB_DB` secrets.
 */
import { MongoClient, type Db } from 'mongodb';

interface MongoEnv {
  MONGODB_URI: string;
  MONGODB_DB: string;
}

interface MongoOpRequest {
  op: 'findOne' | 'find' | 'insertOne' | 'updateOne' | 'deleteOne' | 'countDocuments';
  collection: string;
  filter?: Record<string, unknown>;
  doc?: Record<string, unknown>;
  update?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

// Held at module scope (not just on the DO instance) so a DO restart within
// the same isolate can still find a live connection if one exists — cheap
// insurance, the real persistence guarantee comes from the DO itself.
let cachedClient: MongoClient | null = null;
let cachedDbName: string | null = null;

async function getDb(env: MongoEnv): Promise<Db> {
  if (cachedClient && cachedDbName === env.MONGODB_DB) {
    return cachedClient.db(env.MONGODB_DB);
  }
  if (!env.MONGODB_URI || !env.MONGODB_DB) {
    throw new Error('MONGODB_URI / MONGODB_DB are not configured');
  }
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  cachedDbName = env.MONGODB_DB;
  return client.db(env.MONGODB_DB);
}

export class MongoConnectionDO {
  private env: MongoEnv;

  constructor(_state: DurableObjectState, env: MongoEnv) {
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    let body: MongoOpRequest;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const { op, collection, filter, doc, update, options } = body;
    if (!op || !collection) {
      return jsonError('op and collection are required', 400);
    }

    try {
      const db = await getDb(this.env);
      const coll = db.collection(collection);

      let result: unknown;
      switch (op) {
        case 'findOne':
          result = await coll.findOne(filter || {}, options);
          break;
        case 'find':
          result = await coll.find(filter || {}, options).toArray();
          break;
        case 'insertOne':
          if (!doc) return jsonError('doc is required for insertOne', 400);
          result = await coll.insertOne(doc);
          break;
        case 'updateOne':
          if (!filter || !update) return jsonError('filter and update are required for updateOne', 400);
          result = await coll.updateOne(filter, update, { upsert: Boolean(options?.upsert) });
          break;
        case 'deleteOne':
          if (!filter) return jsonError('filter is required for deleteOne', 400);
          result = await coll.deleteOne(filter);
          break;
        case 'countDocuments':
          result = await coll.countDocuments(filter || {});
          break;
        default:
          return jsonError(`Unknown op: ${op}`, 400);
      }

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      // A failed connection here should not poison future requests — drop
      // the cached client so the next call retries a fresh connect instead
      // of repeatedly hitting a client stuck in a bad state.
      cachedClient = null;
      cachedDbName = null;
      return jsonError(err instanceof Error ? err.message : String(err), 500);
    }
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
