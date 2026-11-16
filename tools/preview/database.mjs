// tools/preview/database.mjs: the test database of the local preview. Same getDatabase().sql`...` as @netlify/database, but a
// real Postgres that lives in memory (PGlite): it starts fresh (with the first people) every time.
import { PGlite } from '@electric-sql/pglite';

export const pg = new PGlite();
export function getDatabase() {
  return { sql: (strings, ...values) => pg.query(strings.reduce((q, s, i) => q + '$' + i + s), values) };
}
