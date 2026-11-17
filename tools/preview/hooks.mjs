// tools/preview/hooks.mjs: in the local preview, "@netlify/database" and "@netlify/blobs" mean test ones in memory, not the real ones.
export async function resolve(specifier, context, next) {
  if (specifier === '@netlify/database') return { url: new URL('./database.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier === '@netlify/blobs') return { url: new URL('./blobs.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
