// tools/preview/hooks.mjs: in the local preview, "@netlify/database" means the test database (database.mjs), not the real one.
export async function resolve(specifier, context, next) {
  if (specifier === '@netlify/database') return { url: new URL('./database.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
