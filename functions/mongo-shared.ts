/**
 * Thin client for the shared MongoConnectionDO Durable Object. Route
 * handlers call these helpers instead of touching the `mongodb` driver or
 * the Durable Object binding directly — that keeps the "how" of talking to
 * Mongo in one place (durable-objects/mongo-connection.ts) and makes it easy
 * to swap or remove during the Airtable → MongoDB migration.
 *
 * Dual-write phase: every write here should go through mongoSafeWrite() so a
 * MongoDB hiccup never breaks the Airtable-primary request it's shadowing.
 * Airtable remains the source of truth until the cutover is verified.
 */

export interface MongoEnv {
  MONGO_CONNECTION?: DurableObjectNamespace;
}

interface MongoOpRequest {
  op: 'findOne' | 'find' | 'insertOne' | 'updateOne' | 'deleteOne' | 'countDocuments';
  collection: string;
  filter?: Record<string, unknown>;
  doc?: Record<string, unknown>;
  update?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

interface MongoOpResponse<T> {
  success: boolean;
  result?: T;
  error?: string;
}

async function callMongo<T = unknown>(env: MongoEnv, body: MongoOpRequest): Promise<T> {
  if (!env.MONGO_CONNECTION) {
    throw new Error('MONGO_CONNECTION binding not configured (check wrangler.toml and that this env has the Durable Object provisioned)');
  }
  // A single fixed name means every request in this Cloudflare location
  // reuses the same DO instance — and therefore the same warm connection —
  // rather than spreading across many idle ones.
  const id = env.MONGO_CONNECTION.idFromName('primary');
  const stub = env.MONGO_CONNECTION.get(id);
  const res = await stub.fetch('https://mongo-do.internal/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json: MongoOpResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error || 'Mongo operation failed');
  return json.result as T;
}

export const ORDERS_COLLECTION = 'orders';
export const COD_ORDERS_COLLECTION = 'cod_orders';

export async function mongoInsertOne(env: MongoEnv, collection: string, doc: Record<string, unknown>) {
  return callMongo(env, { op: 'insertOne', collection, doc });
}

export async function mongoUpdateOne(
  env: MongoEnv,
  collection: string,
  filter: Record<string, unknown>,
  setFields: Record<string, unknown>,
  upsert = false,
) {
  return callMongo(env, { op: 'updateOne', collection, filter, update: { $set: setFields }, options: { upsert } });
}

export async function mongoFindOne<T = unknown>(env: MongoEnv, collection: string, filter: Record<string, unknown>) {
  return callMongo<T>(env, { op: 'findOne', collection, filter });
}

export async function mongoFind<T = unknown>(env: MongoEnv, collection: string, filter: Record<string, unknown>, options?: Record<string, unknown>) {
  return callMongo<T[]>(env, { op: 'find', collection, filter, options });
}

export async function mongoDeleteOne(env: MongoEnv, collection: string, filter: Record<string, unknown>) {
  return callMongo(env, { op: 'deleteOne', collection, filter });
}

export async function mongoCount(env: MongoEnv, collection: string, filter: Record<string, unknown> = {}) {
  return callMongo<number>(env, { op: 'countDocuments', collection, filter });
}

/**
 * Runs a Mongo write and swallows any failure — logs it, never throws.
 * Use this for every dual-write call site: the request this shadows must
 * succeed or fail purely on Airtable, exactly as it did before this file
 * existed.
 */
export async function mongoSafeWrite(fn: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.warn(`[Mongo dual-write] ${label} failed (non-fatal, Airtable is still the source of truth):`, err instanceof Error ? err.message : err);
  }
}
