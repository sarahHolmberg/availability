/**
 * netlify/functions/road.mjs   (the page calls it as /api)
 * -----------------------------------------------------------------------
 * The people of the road, kept in the DATABASE (table road_people).
 *
 * For everyone:
 *   GET                                  -> { people: [{ name, done, days, agreed }], callTimes, taken }
 *        only people who have started; callTimes = the times to book a video call, taken = the ones already booked
 *   POST { action: "check", name }       -> { person }    is this username on the list? (403 if not)
 *   POST { action: "days", name, days, note } -> { person }  save this person's free days (they are then on step 1 or further)
 *   POST { action: "answer", name, form: "call", "games" or "food", answer } -> { person }  save their answers to that step
 *   POST { action: "agree", name }       -> { person }    they agree (only after the video call)
 * What a person does moves them along their own steps by itself (see STEPS_OF below).
 * A username that is not in the table is refused: the usernames are the code.
 *
 * For the organiser (the secret window on the page). key = ADMIN_KEY (CHANGE IN NETLIFY: Site configuration ->
 * Environment variables -> ADMIN_KEY = a secret of your own; without it this part stays closed):
 *   POST { action: "admin-list", key }               -> { people: [...everyone, with answers and note] }
 *   POST { action: "admin-save", key, name, done or by, days } -> add a person, or change their step / days (days optional)
 *        (by = +1 or -1: one step on or back from where they are now)
 *   POST { action: "admin-remove", key, name }       -> remove the person (their username stops working)
 *   POST { action: "admin-times", key, times }       -> save the times to book a video call ["2026-11-25T18:00", ...]
 * -----------------------------------------------------------------------
 */
import crypto from 'node:crypto';
import { getDatabase } from '@netlify/database';
import { run, tables } from '../shared/tables.mjs';

const MAX_DAYS = 120;   // CHANGE HERE: the most days one person can send
const MAX_STEP = 50;    // "done" can never be more than this
// CHANGE HERE if the steps in config.js move: the numbers of the steps the dancer does themself.
const STEP = { days: 1, call: 2, games: 3, food: 4, videoCall: 5, agree: 6 };
// The steps with questions: what may be ticked (saved under pickKey) and which boxes may be written in
const FORMS = {
  call: { pickKey: 'times', fields: ['other'], one: true },
  games: { pickKey: 'games', fields: ['other'] },
  food: { pickKey: 'places', fields: ['order', 'soda'] },
};
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/; // a call time: "2026-11-25T18:00"

/** How far a person has got by themself: each of their steps counts once the one before it is done. */
function reached(row) {
  let d = row.done;
  const has = (col) => { const v = parse(row[col], null); return v && Object.values(v).some((x) => (Array.isArray(x) ? x.length : x)); };
  if (parse(row.days, []).length) d = Math.max(d, STEP.days);
  if (d >= STEP.days && has('call')) d = Math.max(d, STEP.call);
  if (d >= STEP.call && has('games')) d = Math.max(d, STEP.games);
  if (d >= STEP.games && has('food')) d = Math.max(d, STEP.food);
  if (d >= STEP.videoCall && row.agreed) d = Math.max(d, STEP.agree);
  return d;
}
/** After a person saved something: move them on as far as they have got. */
async function moveOn(who) {
  const row = await find(who), d = reached(row);
  if (d !== row.done) await run(db.sql`UPDATE road_people SET done = ${d} WHERE who = ${who}`);
  return find(who);
}
const callTimes = async () => parse((await run(db.sql`SELECT value FROM road_settings WHERE name = 'call_times'`))[0]?.value, []);

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

/** A row of the table as the page gets it. full = with the answers and the note (the person themself, or the organiser). */
function shape(row, full) {
  const p = { name: row.name, done: row.done, days: parse(row.days, []), agreed: !!row.agreed };
  if (full) { p.call = parse(row.call, null); p.games = parse(row.games, null); p.food = parse(row.food, null); p.note = row.note || ''; }
  return p;
}
const find = async (name) => (await run(db.sql`SELECT * FROM road_people WHERE who = ${norm(name)}`))[0] || null;

export default async (req) => {
  try {
    await ensureTables();

    if (req.method === 'GET') {
      const rows = await run(db.sql`SELECT * FROM road_people WHERE done > 0 OR days <> '[]' ORDER BY created_at, who`);
      const all = await run(db.sql`SELECT call FROM road_people WHERE call IS NOT NULL`);
      const taken = all.flatMap((r) => parse(r.call, {}).times || []);
      return reply({ people: rows.map((r) => shape(r, false)), callTimes: await callTimes(), taken });
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
        // by = +1 / -1: one step from where the person is NOW (so a list that is out of date cannot move them back)
        const want = body.by !== undefined ? (old ? old.done : 0) + Math.sign(Number(body.by) || 0) : Number(body.done);
        let done = Number.isFinite(want) ? Math.max(0, Math.min(MAX_STEP, Math.round(want))) : (old ? old.done : 0);
        if (days.length) done = Math.max(done, 1); // days shown = step 1 finished
        await run(db.sql`
          INSERT INTO road_people (who, name, done, days) VALUES (${who}, ${text(body.name, 31).replace(/^@/, '')}, ${done}, ${JSON.stringify(days)})
          ON CONFLICT (who) DO UPDATE SET done = EXCLUDED.done, days = EXCLUDED.days, updated_at = now()`);
        console.log(`[ROAD] organiser saved ${who}: done ${done}, ${days.length} days.`);
      } else if (action === 'admin-times') {
        const times = [...new Set((Array.isArray(body.times) ? body.times : []).filter((t) => typeof t === 'string' && TIME.test(t)))].sort().slice(0, 60);
        await run(db.sql`INSERT INTO road_settings (name, value) VALUES ('call_times', ${JSON.stringify(times)})
          ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`);
        console.log(`[ROAD] organiser saved ${times.length} call times.`);
      } else if (action === 'admin-remove') {
        await run(db.sql`DELETE FROM road_people WHERE who = ${norm(body.name)}`);
        console.log(`[ROAD] organiser removed ${norm(body.name)}.`);
      } else if (action !== 'admin-list') {
        return reply({ error: 'Unknown action.' }, 400);
      }
      const rows = await run(db.sql`SELECT * FROM road_people ORDER BY created_at, who`);
      return reply({ people: rows.map((r) => shape(r, true)), callTimes: await callTimes() });
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
      await run(db.sql`
        UPDATE road_people SET days = ${JSON.stringify(days)}, note = ${text(body.note, 500)}, updated_at = now() WHERE who = ${row.who}`);
      console.log(`[ROAD] ${row.who} saved ${days.length} days.`);
      return reply({ person: shape(await moveOn(row.who), true) });
    }

    if (action === 'answer') {
      const form = FORMS[body.form];
      if (!form) return reply({ error: 'Unknown question.' }, 400);
      const a = body.answer && typeof body.answer === 'object' ? body.answer : {};
      const answer = { [form.pickKey]: (Array.isArray(a[form.pickKey]) ? a[form.pickKey] : []).map((x) => text(x, 40)).filter(Boolean).slice(0, form.one ? 1 : 12) };
      for (const f of form.fields) answer[f] = text(a[f], 200);
      if (body.form === 'call' && answer.times.length) {
        // only one of the organiser's times, and not one someone else booked
        if (!(await callTimes()).includes(answer.times[0])) return reply({ error: 'That time is not offered.' }, 400);
        const others = await run(db.sql`SELECT call FROM road_people WHERE who <> ${row.who} AND call IS NOT NULL`);
        if (others.some((r) => (parse(r.call, {}).times || []).includes(answer.times[0]))) return reply({ error: 'Someone just booked that time. Pick another.' }, 409);
      }
      const json = JSON.stringify(answer);
      if (body.form === 'call') await run(db.sql`UPDATE road_people SET call = ${json}, updated_at = now() WHERE who = ${row.who}`);
      else if (body.form === 'games') await run(db.sql`UPDATE road_people SET games = ${json}, updated_at = now() WHERE who = ${row.who}`);
      else await run(db.sql`UPDATE road_people SET food = ${json}, updated_at = now() WHERE who = ${row.who}`);
      console.log(`[ROAD] ${row.who} saved their ${body.form} answers.`);
      return reply({ person: shape(await moveOn(row.who), true) });
    }

    if (action === 'agree') {
      if (row.done < STEP.videoCall) return reply({ error: 'First the video call.' }, 400);
      await run(db.sql`UPDATE road_people SET agreed = true, updated_at = now() WHERE who = ${row.who}`);
      console.log(`[ROAD] ${row.who} agreed.`);
      return reply({ person: shape(await moveOn(row.who), true) });
    }
    return reply({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('[ROAD] error:', err);
    return reply({ error: 'The database could not be reached. Try again in a moment.' }, 500);
  }
};
