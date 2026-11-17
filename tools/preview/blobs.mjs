// tools/preview/blobs.mjs: in the local preview, "@netlify/blobs" is a store in memory (empty at every start).
const stores = new Map();
export function getStore(opts) {
  const name = typeof opts === 'string' ? opts : opts.name;
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name);
  return {
    async set(key, data, { metadata } = {}) { m.set(key, { data: data.slice ? data.slice() : data, metadata: metadata || {} }); },
    async getWithMetadata(key) { const v = m.get(key); return v ? { data: v.data.buffer ? v.data.buffer.slice(v.data.byteOffset, v.data.byteOffset + v.data.byteLength) : v.data, metadata: v.metadata } : null; },
  };
}
