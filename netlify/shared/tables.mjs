/**
 * netlify/shared/tables.mjs
 * -----------------------------------------------------------------------
 * The DATABASE table, and the people it starts with.
 *   road_people: one row per person: who (the username in small letters = the code), name (the username as shown),
 *                done (how many steps of the road they finished), days (their free days, as JSON text),
 *                food (their food answers, as JSON text), note (what they wrote with their days)
 *   road_meta  : which one-time jobs already ran (the first fill)
 * Not a function itself: it is outside netlify/functions, and Netlify bundles it into the function that imports it.
 * -----------------------------------------------------------------------
 */

// The people the database starts with (what was in data.json). They are put in ONCE, the first time the site runs
// with an empty database. After that, change people in the organiser's window on the page, not here.
const FIRST_PEOPLE = [
  { name: 'amelicgr', done: 1, days: ['2026-12-20', '2026-12-21', '2026-12-22', '2027-01-09', '2027-01-10', '2027-01-16', '2027-01-17', '2027-01-24', '2027-01-30', '2027-01-31'] },
  { name: 'bisaje_navarrete', done: 1, days: ['2026-12-11', '2026-12-12', '2026-12-13', '2027-01-15', '2027-01-16', '2027-01-17'] },
  { name: 'maawan_', done: 1, days: ['2026-12-11', '2026-12-12', '2026-12-13', '2026-12-20', '2026-12-21', '2026-12-22', '2027-01-15', '2027-01-16', '2027-01-17'] },
];

/** Runs a db.sql query and always returns an array of rows. */
export async function run(query) {
  const res = typeof query.execute === 'function' ? await query.execute() : await query;
  return Array.isArray(res) ? res : res?.rows ?? [];
}

/** Creates the tables (and does the first fill). Returns a function to call before each request. */
export function tables(db) {
  let ready = null;
  return () => {
    if (!ready) {
      console.log('[ROAD DATABASE] Ensuring the tables exist.');
      ready = (async () => {
        await run(db.sql`
          CREATE TABLE IF NOT EXISTS road_people (
            who TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0,
            days TEXT NOT NULL DEFAULT '[]',
            food TEXT,
            note TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )`);
        await run(db.sql`CREATE TABLE IF NOT EXISTS road_meta (name TEXT PRIMARY KEY, done_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
        // Only the request that manages to write the name does the first fill, even if two start at the same moment
        const won = await run(db.sql`INSERT INTO road_meta (name) VALUES ('first-people') ON CONFLICT DO NOTHING RETURNING name`);
        if (won.length) {
          for (const p of FIRST_PEOPLE) {
            await run(db.sql`
              INSERT INTO road_people (who, name, done, days) VALUES (${p.name.toLowerCase()}, ${p.name}, ${p.done}, ${JSON.stringify(p.days)})
              ON CONFLICT DO NOTHING`);
          }
          console.warn(`[ROAD DATABASE] First fill done: ${FIRST_PEOPLE.length} people put in.`);
        }
      })().catch((err) => { ready = null; throw err; });
    }
    return ready;
  };
}
