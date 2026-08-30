// Initialize process globally before any function module evaluates
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = { env: {} };
} else if (!globalThis.process.env) {
  (globalThis as any).process.env = {};
}

export const onRequest: PagesFunction<Record<string, string>> = async (context) => {
  if (context.env) {
    for (const [k, v] of Object.entries(context.env)) {
      if (typeof v === 'string') {
        globalThis.process.env[k] = v;
      }
    }
  }
  return context.next();
};
