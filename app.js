// The main page is the road: the steps to the dance meet and where everyone is on it.
// The side pane holds the calendar: who is available, and you paint your own days. To SEND, you type your username:
// it must be one of the names in the database (the code), and then "You" on the road becomes that username.
// The people, their days, their step and their food answers are in the DATABASE (Netlify): the page reads them from
// /api every time it loads, and saves there when somebody sends (netlify/functions/road.mjs). Every send also goes
// out by EMAIL (Web3Forms), as a copy for the organiser. The organiser's window: hold a Sunday for 5 seconds.
const $ = (id) => document.getElementById(id);
const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Small helpers. A day is kept as text "2026-12-10", so it sorts and saves easily.
const pad = (n) => String(n).padStart(2, "0");
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const now = new Date();
const TODAY = key(now.getFullYear(), now.getMonth(), now.getDate());
const inMonths = (k) => MONTHS_SHOWN.includes(k.slice(0, 7));
let PEOPLE = []; // the people from the database (read when the page loads): [{ name, done, days, food }]
const API = "/api"; // the function netlify/functions/road.mjs

/** Ask the database: no body = read the people; a body = { action, ... }. Throws (with the reason and .status) when refused. */
async function api(body) {
  const res = await fetch(API, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  console.log(`[DB] ${body ? body.action : "read"} -> ${res.status}`, body && body.key ? "(organiser)" : data);
  if (!res.ok) throw Object.assign(new Error(data.error || `The server answered ${res.status}.`), { status: res.status });
  return data;
}
/** Put a person from the database in PEOPLE (new, or in place of what was known). */
function keep(person) {
  const i = PEOPLE.findIndex((p) => p.name.toLowerCase() === person.name.toLowerCase());
  if (i < 0) PEOPLE.push(person); else PEOPLE[i] = person;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/** The days of a person in config.js ("2026-12-10" or "2026-12-10 to 2026-12-13") as a list of single days. */
function listDays(days) {
  const out = [];
  for (const item of days || []) {
    const [from, to = from] = String(item).split(/\s*to\s*/).map((s) => s.trim());
    const d = new Date(from + "T12:00:00"), end = new Date(to + "T12:00:00");
    if (isNaN(d) || isNaN(end)) { console.warn("[CONFIG] not a date:", item); continue; }
    for (let n = 0; d <= end && n < 400; d.setDate(d.getDate() + 1), n++) out.push(key(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return out;
}
const load = (k) => { try { return JSON.parse(store.get(k)); } catch { return null; } };
const save = (k, v) => store.set(k, JSON.stringify(v));
const mine = (what) => `availability.${what}.${(myName || "_you").toLowerCase()}`; // this phone's own notes: "days" = the days painted but maybe not sent yet

let myName = null;  // the username typed on this phone (checked by the database), or null = not typed yet: you are "You"
let me = null;      // that person in folk, or null
let folk = [];      // everybody on the road, from the database

/** Put everybody together from PEOPLE (the database), and find you among them. */
function gather() {
  folk = PEOPLE.map((p) => ({ name: p.name, list: listDays(p.days), done: Number(p.done) || 0, food: p.food || null }));
  me = (myName && folk.find((p) => p.name.toLowerCase() === myName.toLowerCase())) || null;
  folk.forEach((p, i) => {
    p.list = p.list.filter(inMonths); // only the days on the calendar
    p.colour = `var(--p${i % 5})`;
    p.done = Math.min(STEPS.length, Math.max(p.done, p.list.length ? 1 : 0)); // days shown = step 1 finished
  });
}
const foodWords = (f) => [(f.places || []).join(", "), f.order, f.soda].filter(Boolean).join(" · ");

/** Days as words: "10-13 Dec, 14-16 Jan" (short), or one line per month for the email. */
function inWords(days, forEmail) {
  const months = new Map();
  for (const k of [...days].sort()) {
    const [y, m, d] = k.split("-").map(Number);
    const name = forEmail ? `${MONTHS[m - 1]} ${y}` : SHORT[m - 1];
    if (!months.has(name)) months.set(name, []);
    const runs = months.get(name), last = runs[runs.length - 1];
    if (last && last[1] === d - 1) last[1] = d; else runs.push([d, d]);
  }
  const text = (runs) => runs.map(([a, b]) => (a === b ? a : `${a}-${b}`)).join(", ");
  return [...months].map(([name, runs]) => (forEmail ? `${name}: ${text(runs)}` : `${text(runs)} ${name}`)).join(forEmail ? "\n" : " · ");
}

let picked = new Set();   // my days

// ------------------------------ The road (main page) ------------------------------
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** Where are you on the road? The step you finished last. Before you typed your username: the very first stop. */
const nowAt = () => (me ? me.done : 0);
const allStops = () => [{ icon: "🚩", title: "Start", text: "Show the days you are free to set off.",
  more: "Everybody starts here. Open the 📅 Days tab and paint the days you are free. Press Send and type your username: that takes you to step 1." }, ...STEPS];
const stepName = (i) => (i ? `Step ${i} of ${STEPS.length}` : "Start");

/** The stops of the road. Passed stops get a tick, the stop we are at NOW is the big green one, the rest is still grey. */
function drawMap() {
  const map = $("map"), now = nowAt(), stops = allStops();
  map.textContent = "";
  $("sub").textContent = !me ? "You are at the start. Open 📅 Days and show the days you are free."
    : me.done >= STEPS.length ? `Hi ${me.name}. You have finished every step.`
    : `Hi ${me.name}. Your next step: ${STEPS[me.done].title}.`;

  // The card at the top: where we are now, and a bar with one piece per step
  const card = $("now");
  card.textContent = "";
  card.append(el("span", "nowLabel", "📍 You are here"), el("b", "", now ? `${stepName(now)}: ${stops[now].title}` : "The start"));
  const bar = el("span", "nowBar");
  STEPS.forEach((_, i) => bar.append(el("i", i < now ? "full" : "")));
  card.append(bar);
  card.onclick = () => map.children[now].scrollIntoView({ behavior: "smooth", block: "center" });

  stops.forEach((s, i) => {
    const here = folk.filter((p) => p.done === i && (i > 0 || p === me)); // a person who has not started only shows to themselves
    if (!me && i === 0) here.unshift({ name: "You", colour: "var(--go)", you: true }); // not typed a username yet: you stand at the start
    const row = el("li", "stop " + (i % 2 ? "right" : "left") + (i < now ? " passed" : i === now ? " now" : ""));
    const btn = el("button"); btn.type = "button";
    btn.addEventListener("click", () => info(i));
    const pin = el("span", "pin", s.icon);
    const body = el("span", "about");
    body.append(el("span", "nr", i === now ? "📍 You are here" : i < now ? `✓ ${stepName(i)}` : stepName(i)),
      el("b", "name", s.title), el("span", "what", s.text));
    if (here.length) {
      const who = el("span", "here");
      for (const p of here) {
        const chip = el("span", "chip" + (p === me || p.you ? " me" : ""));
        chip.style.setProperty("--c", p.colour);
        chip.append(el("i"), p === me ? `${p.name} (you)` : p.name);
        who.append(chip);
      }
      body.append(who);
    }
    body.append(el("span", "moreLink", "More ›"));
    btn.append(pin, body);
    row.append(btn);
    map.append(row);
  });
  drawRoad(now);
  if (shownStep !== null) info(shownStep); // the step window is open: bring it up to date
}

// ------------------------------ More about a step (tap a step) ------------------------------
let shownStep = null; // the step whose window is open, or null
function info(i) {
  shownStep = i;
  const s = allStops()[i], now = nowAt(), box = $("infoCard");
  box.textContent = "";
  const here = folk.filter((p) => p.done === i && (i > 0 || p === me));
  box.append(el("div", "bigIcon", s.icon), el("p", "nr", stepName(i)), el("h2", "", s.title),
    el("p", "state " + (i < now ? "passed" : i === now ? "now" : ""), i < now ? "✓ Done" : i === now ? "📍 You are here" : "Still to come"),
    el("p", "", s.more || s.text));
  if (here.length) box.append(el("p", "soft", `Here now: ${here.map((p) => (p === me ? "you" : p.name)).join(", ")}`));
  if (s.food) {
    for (const p of folk) if (p !== me && p.food) box.append(el("p", "soft", `${p.name}: ${foodWords(p.food)}`)); // answers that were read
    box.append(foodForm(s));
  }
  const close = el("button", "link", "Close"); close.type = "button";
  close.addEventListener("click", closeInfo);
  box.append(close);
  $("info").hidden = false;
}
function closeInfo() { shownStep = null; $("info").hidden = true; }
$("info").addEventListener("click", (e) => { if (e.target === $("info")) closeInfo(); });

/** The food step: tick the places, write the usual order and the favourite soda, and Send saves it. Needs your username. */
function foodForm(step) {
  const form = el("form", "food");
  if (!me) {
    const b = el("button", "primary", "Type your username to answer"); b.type = "button";
    b.addEventListener("click", () => askCode());
    form.append(b);
    return form;
  }
  const saved = me.food || {};
  const ticked = new Set(saved.places || []);
  const places = el("div", "places");
  for (const name of step.food) {
    const b = el("button", "", name); b.type = "button";
    b.setAttribute("aria-pressed", ticked.has(name));
    b.addEventListener("click", () => { ticked.has(name) ? ticked.delete(name) : ticked.add(name); b.setAttribute("aria-pressed", ticked.has(name)); });
    places.append(b);
  }
  const field = (label, value, hint) => {
    const l = el("label"), input = el("input");
    input.value = value || ""; input.placeholder = hint; input.maxLength = 200;
    l.append(el("span", "", label), input);
    form.append(l);
    return input;
  };
  form.append(el("p", "q", "Where do you eat? Tick all that fit."), places);
  const order = field("What do you usually order there?", saved.order, "e.g. cheeseburger meal, no onion");
  const soda = field("Your favourite soda", saved.soda, "e.g. Fanta");
  const msg = el("p", "error"), send = el("button", "primary", "Send my food preference");
  send.type = "submit";
  form.append(msg, send);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "error";
    if (!ticked.size && !order.value.trim() && !soda.value.trim()) { msg.textContent = "Tick a place or write something first."; return; }
    const answer = { places: [...ticked], order: order.value.trim(), soda: soda.value.trim() };
    send.disabled = true; send.textContent = "Sending…"; msg.textContent = "";
    try {
      keep((await api({ action: "food", name: me.name, food: answer })).person); // saved in the database
      mail(`${TITLE}: food preference of ${me.name}`, {                          // and a copy by email
        "Eats at": answer.places.join(", ") || "(nothing ticked)",
        "Usual order": answer.order || "(not written)",
        "Favourite soda": answer.soda || "(not written)",
      }, { food: answer }).catch(() => {});
      gather();
      msg.className = "ok"; msg.textContent = "✓ Saved. Thank you!";
    } catch (err) {
      msg.textContent = `Not saved: ${err.message || "no connection"}. Try again.`;
    } finally {
      send.disabled = false; send.textContent = "Send my food preference";
    }
  });
  return form;
}

/** The line that joins the stops: it winds from circle to circle, solid green as far as upTo, dotted after that. */
function drawRoad(upTo) {
  const map = $("map"), road = $("road"), box = map.getBoundingClientRect();
  const at = [...map.querySelectorAll(".pin")].map((p) => { const r = p.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
  const line = (pts) => pts.map(([x, y], i) => {
    if (!i) return `M${x} ${y}`;
    const [px, py] = pts[i - 1], mid = (py + y) / 2;
    return `C${px} ${mid} ${x} ${mid} ${x} ${y}`;
  }).join(" ");
  road.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  road.querySelector(".todo").setAttribute("d", line(at));
  road.querySelector(".gone").setAttribute("d", line(at.slice(0, upTo + 1)));
}
addEventListener("resize", () => drawMap());

// ------------------------------ The side pane ------------------------------
function pane(open) {
  document.body.classList.toggle("paneOpen", open);
  $("pane").inert = !open;
  $("tab").setAttribute("aria-expanded", open);
  if (open) $("paneClose").focus({ preventScroll: true });
}
$("tab").addEventListener("click", () => pane(!document.body.classList.contains("paneOpen")));
$("paneClose").addEventListener("click", () => pane(false));
$("shade").addEventListener("click", () => pane(false));

// ------------------------------ The calendar (in the side pane) ------------------------------
function draw() {
  drawMap();
  const others = folk.filter((p) => p !== me);
  $("hello").textContent = me ? `Hi ${me.name}, paint your days` : "Paint the days you are free";
  $("leave").hidden = !me;

  // Who is on the calendar
  const legend = $("legend");
  legend.textContent = "";
  const row = (colour, name, text, mine) => {
    const li = document.createElement("li"), i = document.createElement("i"), b = document.createElement("b"), s = document.createElement("span");
    li.style.setProperty("--c", colour); if (mine) li.className = "me";
    b.textContent = name; s.textContent = text;
    li.append(i, b, s); legend.append(li);
    return s;
  };
  row("var(--go)", me ? `You (${me.name})` : "You", "", true).id = "myDays";
  for (const p of others) if (p.list.length) row(p.colour, p.name, inWords(p.list));
  if (!legend.children.length) row("var(--line)", "Nobody yet", "Be the first");

  // The months. Under a day: one dot per person who is free, in that person's colour
  const box = $("months");
  box.textContent = "";
  for (const ym of MONTHS_SHOWN) {
    const [y, m] = ym.split("-").map(Number), month = m - 1;
    const first = new Date(y, month, 1), days = new Date(y, month + 1, 0).getDate();
    const sec = document.createElement("section"); sec.className = "month";
    const h = document.createElement("h3"); h.textContent = `${MONTHS[month]} ${y}`;
    const wd = document.createElement("div"); wd.className = "weekdays";
    const grid = document.createElement("div"); grid.className = "grid"; grid.setAttribute("role", "grid");

    // A weekday name takes its whole column in that month: all on, or (if they are all on already) all off.
    WEEKDAYS.forEach((name, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = name;
      b.setAttribute("aria-label", `All ${name} days in ${MONTHS[month]}`);
      b.addEventListener("click", () => {
        const cells = [...grid.children].filter((c, n) => n % 7 === i && c.dataset.day && c.dataset.day >= TODAY);
        const on = !cells.every((c) => picked.has(c.dataset.day));
        cells.forEach((c) => set(c, on));
      });
      wd.append(b);
    });

    for (let i = (first.getDay() + 6) % 7; i > 0; i--) grid.append(document.createElement("span")); // the week starts on Monday
    for (let d = 1; d <= days; d++) {
      const k = key(y, month, d), who = others.filter((p) => p.list.includes(k));
      const cell = document.createElement("div");
      cell.className = "day" + (k < TODAY ? " past" : "") + (k === TODAY ? " today" : "") + (who.length ? " busy" : "") + (picked.has(k) ? " on" : "");
      cell.dataset.day = k;
      if (new Date(y, month, d).getDay() === 0) cell.dataset.sunday = "1";
      cell.setAttribute("role", "gridcell");
      cell.append(String(d));
      let label = `${d} ${MONTHS[month]}`;
      if (who.length) {
        const dots = document.createElement("div"); dots.className = "dots";
        for (const p of who) { const dot = document.createElement("i"); dot.style.setProperty("--c", p.colour); dots.append(dot); }
        cell.append(dots);
        label += `: ${who.map((p) => p.name).join(", ")}`;
      }
      cell.setAttribute("aria-label", label);
      if (k >= TODAY) { cell.tabIndex = 0; cell.setAttribute("aria-selected", picked.has(k)); }
      grid.append(cell);
    }
    sec.append(h, wd, grid); box.append(sec);
  }
  count();
}

function count() {
  $("sendError").textContent = "";
  $("count").textContent = picked.size;
  $("countLabel").textContent = picked.size === 1 ? "day" : "days";
  $("clear").hidden = picked.size === 0;
  $("myDays").textContent = picked.size ? inWords(picked) : "No days yet";
  save(mine("days"), [...picked].sort());
}

/** Switch one of my days on or off (on = true/false). Days that have passed cannot be chosen. */
function set(cell, on) {
  const k = cell?.dataset?.day;
  if (!k || k < TODAY || picked.has(k) === on) return;
  on ? picked.add(k) : picked.delete(k);
  cell.classList.toggle("on", on);
  cell.setAttribute("aria-selected", on);
  if (navigator.vibrate) navigator.vibrate(8);
  count();
}

// Painting: the first day you touch decides (was it off? then you paint days ON; was it on? then you wipe them OFF),
// and every day your finger passes gets the same. Sideways paints; up and down still scrolls the page, and when the
// phone takes a touch as scrolling, the day that touch started on goes back to what it was.
let painting = null;  // null = not painting, true = switching on, false = switching off
let startCell = null; // the day the touch started on
let moved = false;    // did the touch reach a second day?
let holding = 0;      // the timer of the secret long press
const SECRET_HOLD = 5000; // CHANGE HERE: how long (ms) a Sunday must be held
const dayAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".day");
$("months").addEventListener("pointerdown", (e) => {
  const cell = dayAt(e);
  if (!cell || cell.classList.contains("past")) return;
  painting = !picked.has(cell.dataset.day);
  startCell = cell; moved = false;
  set(cell, painting);
  // The secret: keep a Sunday pressed for 5 seconds (without moving) and the organiser's window opens
  clearTimeout(holding);
  if (cell.dataset.sunday) holding = setTimeout(() => {
    if (painting === null || moved) return;
    set(startCell, !painting); // the press was not meant as a tap: the day goes back to what it was
    painting = null;
    secret();
  }, SECRET_HOLD);
});
$("months").addEventListener("contextmenu", (e) => e.preventDefault()); // a long press must not open the phone's own menu
addEventListener("pointermove", (e) => {
  if (painting === null) return;
  const cell = dayAt(e);
  if (cell && cell !== startCell) { moved = true; clearTimeout(holding); }
  set(cell, painting);
});
addEventListener("pointerup", () => { painting = null; clearTimeout(holding); });
addEventListener("pointercancel", () => {
  if (painting !== null && !moved) set(startCell, !painting); // it was a scroll, not a tap
  painting = null; clearTimeout(holding);
});
$("months").addEventListener("keydown", (e) => {
  if ((e.key === " " || e.key === "Enter") && e.target.dataset.day) { e.preventDefault(); set(e.target, !picked.has(e.target.dataset.day)); }
});
$("clear").addEventListener("click", () => { picked.clear(); draw(); });

// ------------------------------ The code ------------------------------
/** Continue as this username (the database said yes): the days known for them (painted before on this phone, or else
 *  from the database), plus the days painted just now as "You". */
function open(name) {
  const justPainted = !myName && picked.size ? [...picked] : null;
  myName = (PEOPLE.find((p) => p.name.toLowerCase() === String(name).trim().replace(/^@/, "").toLowerCase()) || { name }).name;
  store.set("availability.code", myName);
  store.del("availability.days._you");
  gather();
  const before = load(mine("days")), known = Array.isArray(before) ? before : me.list; // your days from earlier
  picked = new Set([...known, ...(justPainted || [])].filter((d) => d >= TODAY && inMonths(d))); // what you just painted is added to them
  $("gate").hidden = true; $("done").hidden = true;
  draw();
}

let afterCode = null; // what to do once the username is accepted (send the days), or null
function askCode(then) {
  afterCode = then || null;
  $("gate").hidden = false; $("gateError").textContent = ""; $("code").value = ""; $("code").focus();
}
$("gateClose").addEventListener("click", () => { $("gate").hidden = true; });
$("gate").addEventListener("click", (e) => { if (e.target === $("gate")) $("gate").hidden = true; });
addEventListener("keydown", (e) => { // Escape closes the window on top: first the code window, then the side pane
  if (e.key !== "Escape") return;
  if (!$("gate").hidden) $("gate").hidden = true; else if (!$("read").hidden) $("read").hidden = true; else if (shownStep !== null) closeInfo(); else if ($("done").hidden) pane(false);
});

$("gateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const typed = $("code").value.trim(), btn = $("gateForm").querySelector(".primary");
  const wrong = (text) => {
    $("gateError").textContent = text;
    $("code").classList.remove("shake"); void $("code").offsetWidth; $("code").classList.add("shake");
    $("code").select();
  };
  if (!typed) return wrong("Type your username first.");
  btn.disabled = true; $("gateError").textContent = "";
  try {
    const { person } = await api({ action: "check", name: typed }); // the database knows who is on the list
    keep(person);
    const then = afterCode; afterCode = null;
    open(person.name);
    if (then) then();
  } catch (err) {
    console.warn("[CODE] REFUSED:", typed, err.message);
    wrong(err.status === 403 ? "That username is not on the list. Check the spelling, or ask to be added." : `Could not check: ${err.message || "no connection"}. Try again.`);
  } finally {
    btn.disabled = false;
  }
});

$("leave").addEventListener("click", () => { store.del("availability.code"); myName = null; picked = new Set(); gather(); draw(); $("note").value = ""; });

// ------------------------------ The email ------------------------------
/** Send one email through Web3Forms: a subject, the lines { label: text } and the facts for the JSON line (what
 *  "Read progress" takes in). Throws (with the reason) when it is not sent.
 *  Debug prints (browser console, F12): every step of the sending, tagged [MAIL]. The key is shown shortened. */
async function mail(subject, lines, facts) {
  if (!WEB3FORMS_KEY) { console.warn("[MAIL] NOT SENT: the Web3Forms key is missing (config.js)."); throw new Error("sending is not set up yet (the Web3Forms key is missing in config.js)"); }
  const form = new FormData();
  form.append("access_key", WEB3FORMS_KEY);
  form.append("subject", subject);
  form.append("from_name", TITLE);
  form.append("Name", me.name);
  for (const [label, text] of Object.entries(lines)) form.append(label, text);
  form.append("JSON", JSON.stringify({ name: me.name, ...facts }));
  const shown = Object.fromEntries(form);
  shown.access_key = WEB3FORMS_KEY.slice(0, 8) + "…";
  console.log("[MAIL] 1. Sending to", WEB3FORMS_URL, "at", new Date().toLocaleTimeString());
  console.log("[MAIL] 2. What is sent:", shown);
  const started = performance.now();
  try {
    const res = await fetch(WEB3FORMS_URL, { method: "POST", headers: { Accept: "application/json" }, body: form });
    console.log(`[MAIL] 3. The mail service answered: ${res.status} ${res.statusText} after ${Math.round(performance.now() - started)} ms`);
    const raw = await res.text();
    let data = {};
    try { data = JSON.parse(raw); } catch { console.warn("[MAIL] The answer is not JSON:", raw.slice(0, 300)); }
    console.log("[MAIL] 4. Its answer:", data);
    if (!res.ok || !data.success) throw new Error(data.message || `The mail service answered ${res.status}.`);
    console.log("[MAIL] 5. SENT ✓ The mail service accepted it. Check the inbox (and the spam folder).");
  } catch (err) {
    console.error("[MAIL] NOT SENT ✗", err.message || err, navigator.onLine ? "" : "(this device is offline)");
    throw err;
  }
}

$("send").addEventListener("click", sendDays);
async function sendDays() {
  if (!me) return askCode(sendDays); // first your username (the database checks it), then it saves
  const btn = $("send"), n = picked.size;
  btn.disabled = true; btn.textContent = "Saving…"; $("sendError").textContent = "";
  const note = $("note").value.trim();
  const lines = { Available: n ? inWords(picked, true) : "No days (everything removed)" };
  if (note) lines.Note = note;
  if (n) lines["All days"] = [...picked].sort().join(", ");
  try {
    const days = [...picked].sort();
    keep((await api({ action: "days", name: me.name, days, note })).person); // saved in the database: everyone sees it
    mail(`${TITLE}: ${me.name} (${n} ${n === 1 ? "day" : "days"})`, lines, { days }).catch(() => {}); // and a copy by email
    gather(); draw();
    $("doneText").textContent = n
      ? `Thanks ${me.name}. Your ${n} ${n === 1 ? "day is" : "days are"} saved. You are now on step ${me.done}: ${allStops()[me.done].title}.`
      : `Thanks ${me.name}. It is saved that you have no days.`;
    $("done").hidden = false;
  } catch (err) {
    $("sendError").textContent = `Not saved: ${err.message || "no connection"}. Your days are kept; try again.`;
  } finally {
    btn.textContent = "Send"; btn.disabled = false;
  }
}
$("again").addEventListener("click", () => { $("done").hidden = true; });

// ------------------------------ The organiser's window (hold a Sunday for 5 seconds) ------------------------------
let adminKey = "";
try { adminKey = sessionStorage.getItem("availability.key") || ""; } catch {}

function secret() {
  console.log("[SECRET] the organiser's window opens");
  $("read").hidden = false; $("readMsg").textContent = "";
  if (adminKey) admin({ action: "admin-list" }); else { $("adminList").textContent = ""; $("adminAdd").hidden = true; $("adminForm").hidden = false; $("adminKey").focus(); }
}

/** One organiser action on the database; then the list is drawn again and the road follows. */
async function admin(body) {
  const msg = $("readMsg");
  msg.className = "error"; msg.textContent = "";
  try {
    const { people } = await api({ ...body, key: adminKey });
    try { sessionStorage.setItem("availability.key", adminKey); } catch {}
    $("adminForm").hidden = true; $("adminAdd").hidden = false;
    drawAdmin(people);
    PEOPLE = (await api()).people;            // the road: read fresh
    if (myName) { const self = people.find((p) => p.name.toLowerCase() === myName.toLowerCase()); if (self) keep(self); }
    gather(); draw();
  } catch (err) {
    msg.textContent = err.message || "No connection.";
    if (err.status === 403 || err.status === 503) { adminKey = ""; $("adminForm").hidden = false; $("adminAdd").hidden = true; $("adminList").textContent = ""; }
  }
}

/** Everybody in the database: their step (− and + move them along the road), their days, food answers and note. */
function drawAdmin(people) {
  const list = $("adminList"), stops = allStops();
  list.textContent = "";
  if (!people.length) list.append(el("p", "soft", "Nobody yet. Add a username below."));
  for (const p of people) {
    const row = el("div", "adminRow"), step = el("div", "stepper");
    const move = (by) => admin({ action: "admin-save", name: p.name, done: p.done + by });
    const minus = el("button", "", "−"), plus = el("button", "", "+"), del = el("button", "link", "Remove");
    minus.type = plus.type = del.type = "button";
    minus.disabled = p.done <= (p.days.length ? 1 : 0); plus.disabled = p.done >= STEPS.length;
    minus.setAttribute("aria-label", `${p.name}: one step back`); plus.setAttribute("aria-label", `${p.name}: one step forward`);
    minus.addEventListener("click", () => move(-1)); plus.addEventListener("click", () => move(1));
    del.addEventListener("click", () => { if (confirm(`Remove ${p.name}? Their username stops working and their days are deleted.`)) admin({ action: "admin-remove", name: p.name }); });
    step.append(minus, el("b", "", String(p.done)), plus);
    row.append(el("b", "who", p.name), step,
      el("p", "soft", p.done ? `${stepName(p.done)}: ${(stops[p.done] || stops[stops.length - 1]).title}` : "Not started"),
      el("p", "", p.days.length ? `📅 ${inWords(p.days)}` : "📅 no days yet"));
    if (p.food) row.append(el("p", "", `🍔 ${foodWords(p.food)}`));
    if (p.note) row.append(el("p", "", `✏️ ${p.note}`));
    row.append(del);
    list.append(row);
  }
}
$("adminForm").addEventListener("submit", (e) => { e.preventDefault(); adminKey = $("adminKey").value; $("adminKey").value = ""; admin({ action: "admin-list" }); });
$("adminAdd").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("adminName").value.trim();
  if (!name) return;
  $("adminName").value = "";
  admin({ action: "admin-save", name, done: 0 });
});
$("readClose").addEventListener("click", () => { $("read").hidden = true; });
$("read").addEventListener("click", (e) => { if (e.target === $("read")) $("read").hidden = true; });

// ------------------------------ Start ------------------------------
document.title = TITLE;
$("title").textContent = TITLE;
pane(false);
(async () => {
  if (window.AWAY) return; // the old address: redirect.js is sending the visitor to the new one
  // The people: read from the database, fresh every time the page loads
  try {
    PEOPLE = (await api()).people;
  } catch (err) {
    console.error("[DB] the people could not be read:", err.message || err);
    $("dataError").textContent = "The people could not be loaded. Check your connection and reload the page.";
  }
  // Been here before on this phone: continue as you (if the database still knows the username)
  const before = store.get("availability.code");
  if (before) {
    try { keep((await api({ action: "check", name: before })).person); myName = null; return open(before); }
    catch (err) { if (err.status === 403) store.del("availability.code"); }
  }
  gather();
  picked = new Set((load(mine("days")) || []).filter((d) => d >= TODAY && inMonths(d)));
  draw();
})();
