/**
 * netlify/functions/road.mjs   (the page calls it as /api)
 * -----------------------------------------------------------------------
 * The people of the road, kept in the DATABASE (table road_people).
 *
 * For everyone:
 *   GET                                  -> { people: [{ name, done, days }] }   only people who have started
 *   POST { action: "check", name }       -> { person }    is this username on the list? (403 if not)
 *   POST { action: "days", name, days, note } -> { person }  save this person's free days (they are then on step 1 or further)
 *   POST { action: "food", name, food }  -> { person }    save this person's food answers
 * A username that is not in the table is refused: the usernames are the code.
 *
 * For the organiser (the secret window on the page). key = ADMIN_KEY (CHANGE IN NETLIFY: Site configuration ->
 * Environment variables -> ADMIN_KEY = a secret of your own; without it this part stays closed):
 *   POST { action: "admin-list", key }               -> { people: [...everyone, with food and note] }
 *   POST { action: "admin-save", key, name, done, days } -> add a person, or change their step / days (days optional)
 *   POST { action: "admin-remove", key, name }       -> remove the person (their username stops working)
 * -----------------------------------------------------------------------
 */
import crypto from 'node:crypto';
import { getDatabase } from '@netlify/database';
import { run, tables } from '../shared/tables.mjs';

const MAX_DAYS = 120;   // CHANGE HERE: the most days one person can send
const MAX_STEP = 50;    // "done" can never be more than this

const ADMIN_KEY = process.env.ADMIN_KEY || '';
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b)); // constant-time compare
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const db = getDatabase();
const ensureTables = tables(db);

const norm = (s) => (typeof s === 'string' ? s.trim().replace(/^@/, '').toLowerCase() : ''); // capitals and a leading @ do not matter
const parse = (text, empty) => { try { return JSON.parse(text) ?? empty; } catch { return empty; } };
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Only real days "2026-12-10", each once, sorted. null = this is not a list of days. */
function cleanDays(days) {
  if (!Array.isArray(days) || days.length > MAX_DAYS) return null;
  const out = new Set();
  for (const d of days) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(new Date(d + 'T12:00:00Z'))) return null;
    out.add(d);
  }
  return [...out].sort();
}

/** A row of the table as the page gets it. full = with the food answers and the note (the person themself, or the organiser). */
function shape(row, full) {
  const p = { name: row.name, done: row.done, days: parse(row.days, []) };
  if (full) { p.food = parse(row.food, null); p.note = row.note || ''; }
  return p;
}
const find = async (name) => (await run(db.sql`SELECT * FROM road_people WHERE who = ${norm(name)}`))[0] || null;

export default async (req) => {
  try {
    await ensureTables();

    if (req.method === 'GET') {
      const rows = await run(db.sql`SELECT * FROM road_people WHERE done > 0 OR days <> '[]' ORDER BY created_at, who`);
      return reply({ people: rows.map((r) => shape(r, false)) });
    }
    if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ---------------- The organiser ----------------
    if (typeof action === 'string' && action.startsWith('admin-')) {
      if (!ADMIN_KEY) return reply({ error: 'The organiser key is not set up yet (ADMIN_KEY in Netlify).' }, 503);
      if (typeof body.key !== 'string' || !body.key || !same(body.key, ADMIN_KEY)) {
        console.warn('[ROAD] REFUSED: wrong organiser key.');
        await sleep(500); // slows down guessing
        return reply({ error: 'Wrong key.' }, 403);
      }
      if (action === 'admin-save') {
        const who = norm(body.name);
        if (!/^[\w.]{2,30}$/.test(who)) return reply({ error: 'A username is 2 to 30 letters, numbers, dots or _.' }, 400);
        const old = await find(who);
        const days = body.days === undefined ? (old ? parse(old.days, []) : []) : cleanDays(body.days);
        if (!days) return reply({ error: 'The days are not right.' }, 400);
        let done = Number.isFinite(Number(body.done)) ? Math.max(0, Math.min(MAX_STEP, Math.round(Number(body.done)))) : (old ? old.done : 0);
        if (days.length) done = Math.max(done, 1); // days shown = step 1 finished
        await run(db.sql`
          INSERT INTO road_people (who, name, done, days) VALUES (${who}, ${text(body.name, 31).replace(/^@/, '')}, ${done}, ${JSON.stringify(days)})
          ON CONFLICT (who) DO UPDATE SET done = EXCLUDED.done, days = EXCLUDED.days, updated_at = now()`);
        console.log(`[ROAD] organiser saved ${who}: done ${done}, ${days.length} days.`);
      } else if (action === 'admin-remove') {
        await run(db.sql`DELETE FROM road_people WHERE who = ${norm(body.name)}`);
        console.log(`[ROAD] organiser removed ${norm(body.name)}.`);
      } else if (action !== 'admin-list') {
        return reply({ error: 'Unknown action.' }, 400);
      }
      const rows = await run(db.sql`SELECT * FROM road_people ORDER BY created_at, who`);
      return reply({ people: rows.map((r) => shape(r, true)) });
    }

    // ---------------- A person: the username is the code ----------------
    const row = await find(body.name);
    if (!row) {
      console.warn('[ROAD] REFUSED: username not on the list:', norm(body.name).slice(0, 40));
      await sleep(400); // slows down guessing
      return reply({ error: 'That username is not on the list.' }, 403);
    }
    if (action === 'check') return reply({ person: shape(row, true) });

    if (action === 'days') {
      const days = cleanDays(body.days);
      if (!days) return reply({ error: 'The days are not right.' }, 400);
      const done = days.length ? Math.max(row.done, 1) : row.done; // days shown = step 1 finished
      await run(db.sql`
        UPDATE road_people SET days = ${JSON.stringify(days)}, done = ${done}, note = ${text(body.note, 500)}, updated_at = now() WHERE who = ${row.who}`);
      console.log(`[ROAD] ${row.who} saved ${days.length} days.`);
      return reply({ person: shape(await find(row.who), true) });
    }

    if (action === 'food') {
      const f = body.food && typeof body.food === 'object' ? body.food : {};
      const food = {
        places: (Array.isArray(f.places) ? f.places : []).map((x) => text(x, 40)).filter(Boolean).slice(0, 12),
        order: text(f.order, 200),
        soda: text(f.soda, 200),
      };
      await run(db.sql`UPDATE road_people SET food = ${JSON.stringify(food)}, updated_at = now() WHERE who = ${row.who}`);
      console.log(`[ROAD] ${row.who} saved their food answers.`);
      return reply({ person: shape(await find(row.who), true) });
    }
    return reply({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('[ROAD] error:', err);
    return reply({ error: 'The database could not be reached. Try again in a moment.' }, 500);
  }
};
